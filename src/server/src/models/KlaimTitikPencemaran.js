// C03 KlaimTitikPencemaran: locking a hotspot for one volunteer (KNF05, R12).
import { db, withTransaction } from '../db/pool.js';
import { config } from '../config.js';
import { conflict, notFound } from '../utils/errors.js';

const toKlaim = (r) => r && ({
  idKlaim: r.id_klaim,
  kode: r.kode,
  idLaporan: r.id_laporan,
  kodeLaporan: r.kode_laporan,
  idRelawan: r.id_relawan,
  koordinatTitik: r.wkt,
  lat: r.lat,
  lon: r.lon,
  wktKlaim: r.wkt_klaim,
  batasWaktu: r.batas_waktu,
  statusKlaim: r.status_klaim,
  lokasiNama: r.lokasi_nama,
  indikatorTingkat: r.indikator_tingkat,
});

const COLS = `k.id_klaim, k.kode, k.id_laporan, l.kode AS kode_laporan, k.id_relawan, ST_AsText(k.koordinat_titik) AS wkt,
  ST_Y(k.koordinat_titik::geometry) AS lat, ST_X(k.koordinat_titik::geometry) AS lon, k.wkt_klaim, k.batas_waktu, k.status_klaim,
  l.lokasi_nama, l.indikator_tingkat`;

export class KlaimTitikPencemaran {
  /** getStatusKlaim(idLaporan): "Belum diklaim" or the live claim status. */
  static async getStatusKlaim(idLaporan, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS} FROM klaim_titik_pencemaran k JOIN laporan_pencemaran l ON l.id_laporan = k.id_laporan
       WHERE k.id_laporan = $1 AND k.status_klaim IN ('Aktif','Menunggu Verifikasi')`, [idLaporan]);
    return rows[0] ? toKlaim(rows[0]) : null;
  }

  /**
   * Algo-003 kunciTitikLokasi(dataKlaim). Q-002 locks the report row with FOR UPDATE so concurrent
   * claims on the same point serialise; the partial unique indexes are a second guard.
   */
  static async kunciTitikLokasi({ idRelawan, idLaporan }) {
    try {
      return await withTransaction(async (c) => {
        const { rows } = await c.query(
          'SELECT id_laporan, status_laporan, koordinat_gps FROM laporan_pencemaran WHERE id_laporan = $1 FOR UPDATE', [idLaporan]);
        const lap = rows[0];
        if (!lap) throw notFound('REPORT_NOT_FOUND', 'Report not found.');
        if (lap.status_laporan === 'Diklaim') throw conflict('ALREADY_CLAIMED', 'This point has already been claimed by someone else.');
        if (lap.status_laporan !== 'Disetujui') throw conflict('NOT_CLAIMABLE', 'Only verified points can be claimed.');
        const mine = await c.query(
          `SELECT kode FROM klaim_titik_pencemaran WHERE id_relawan = $1 AND status_klaim IN ('Aktif','Menunggu Verifikasi')`, [idRelawan]);
        if (mine.rows[0]) throw conflict('HAS_ACTIVE_CLAIM', 'Finish or release your current claim first.', { kode: mine.rows[0].kode });
        const ins = await c.query(
          `INSERT INTO klaim_titik_pencemaran (id_laporan, id_relawan, koordinat_titik, batas_waktu, status_klaim)
           VALUES ($1, $2, $3, now() + make_interval(days => $4), 'Aktif') RETURNING id_klaim`,
          [idLaporan, idRelawan, lap.koordinat_gps, config.rules.claimDays]);
        await c.query(`UPDATE laporan_pencemaran SET status_laporan = 'Diklaim' WHERE id_laporan = $1`, [idLaporan]);
        const out = await c.query(`SELECT ${COLS} FROM klaim_titik_pencemaran k JOIN laporan_pencemaran l ON l.id_laporan = k.id_laporan WHERE k.id_klaim = $1`, [ins.rows[0].id_klaim]);
        return toKlaim(out.rows[0]);
      });
    } catch (e) {
      if (e.code === '23505') {
        throw e.constraint === 'ux_klaim_relawan_hidup'
          ? conflict('HAS_ACTIVE_CLAIM', 'Finish or release your current claim first.')
          : conflict('ALREADY_CLAIMED', 'This point has already been claimed by someone else.');
      }
      throw e;
    }
  }

  /** getKoordinatAcuan(idRelawan): coordinates of the volunteer's active claim (geofence reference). */
  static async getKoordinatAcuan(idRelawan, client) {
    const k = await KlaimTitikPencemaran.getKlaimHidup(idRelawan, client);
    return k && k.statusKlaim === 'Aktif' ? k : null;
  }

  static async getKlaimHidup(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS} FROM klaim_titik_pencemaran k JOIN laporan_pencemaran l ON l.id_laporan = k.id_laporan
       WHERE k.id_relawan = $1 AND k.status_klaim IN ('Aktif','Menunggu Verifikasi')`, [idRelawan]);
    return toKlaim(rows[0]);
  }

  static async getRiwayatKlaim(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS} FROM klaim_titik_pencemaran k JOIN laporan_pencemaran l ON l.id_laporan = k.id_laporan
       WHERE k.id_relawan = $1 ORDER BY k.wkt_klaim DESC LIMIT 100`, [idRelawan]);
    return rows.map(toKlaim);
  }

  /** ubahStatusKlaim(idKlaim, status). */
  static async ubahStatusKlaim(idKlaim, status, client) {
    await db(client).query('UPDATE klaim_titik_pencemaran SET status_klaim = $2, diperbarui = now() WHERE id_klaim = $1', [idKlaim, status]);
    return true;
  }

  /** Volunteer releases an active claim; the point returns to the board. */
  static async batalkanKlaim(idRelawan) {
    return withTransaction(async (c) => {
      const { rows } = await c.query(
        `UPDATE klaim_titik_pencemaran SET status_klaim = 'Dibatalkan', diperbarui = now()
         WHERE id_relawan = $1 AND status_klaim = 'Aktif' RETURNING id_laporan, kode`, [idRelawan]);
      if (!rows[0]) throw notFound('NO_ACTIVE_CLAIM', 'You have no active claim.');
      await c.query(`UPDATE laporan_pencemaran SET status_laporan = 'Disetujui' WHERE id_laporan = $1 AND status_laporan = 'Diklaim'`, [rows[0].id_laporan]);
      return rows[0];
    });
  }

  /** R12: claims past their 7-day window expire and the point is released. Returns expired rows. */
  static async kedaluwarsakan() {
    return withTransaction(async (c) => {
      const { rows } = await c.query(
        `UPDATE klaim_titik_pencemaran SET status_klaim = 'Kedaluwarsa', diperbarui = now()
         WHERE status_klaim = 'Aktif' AND batas_waktu < now() RETURNING id_laporan, id_relawan, kode`);
      for (const r of rows) {
        await c.query(`UPDATE laporan_pencemaran SET status_laporan = 'Disetujui' WHERE id_laporan = $1 AND status_laporan = 'Diklaim'`, [r.id_laporan]);
      }
      return rows;
    });
  }
}
