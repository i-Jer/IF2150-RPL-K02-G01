// C04 LaporanPembersihan: cleanup report awaiting verification.
import { db } from '../db/pool.js';
import { bad, conflict, notFound } from '../utils/errors.js';
import { pointSql } from '../utils/geo.js';

const toPembersihan = (r) => r && ({
  idPembersihan: r.id_pembersihan,
  kode: r.kode,
  idKlaim: r.id_klaim,
  kodeKlaim: r.kode_klaim,
  idRelawan: r.id_relawan,
  namaRelawan: r.nama_relawan,
  deskripsiKegiatan: r.deskripsi_kegiatan,
  jumlahPeserta: r.jumlah_peserta,
  perkiraanBeratKg: r.perkiraan_berat_kg,
  tglSelesai: r.tgl_selesai,
  statusPembersihan: r.status_pembersihan,
  poinDiberikan: r.poin_diberikan,
  catatanVerifikasi: r.catatan_verifikasi,
  kodeLaporan: r.kode_laporan,
  idLaporan: r.id_laporan,
  lokasiNama: r.lokasi_nama,
  indikatorTingkat: r.indikator_tingkat,
  lat: r.lat,
  lon: r.lon,
});

const COLS = `lp.*, k.kode AS kode_klaim, a.nama AS nama_relawan, l.kode AS kode_laporan, l.id_laporan, l.lokasi_nama, l.indikator_tingkat,
  ST_Y(k.koordinat_titik::geometry) AS lat, ST_X(k.koordinat_titik::geometry) AS lon`;
const FROM = `FROM laporan_pembersihan lp JOIN klaim_titik_pencemaran k ON k.id_klaim = lp.id_klaim
  JOIN laporan_pencemaran l ON l.id_laporan = k.id_laporan JOIN akun_relawan a ON a.id_relawan = lp.id_relawan`;

export class LaporanPembersihan {
  /** buatLaporanPembersihan(idRelawan, deskripsi, fotoBeforeUrl, fotoAfterUrl) */
  static buatLaporanPembersihan(idRelawan, deskripsi, fotoBeforeUrl, fotoAfterUrl, extra = {}) {
    const d = String(deskripsi || '').trim();
    if (d.length < 10) throw bad('CLEANUP_DESC_SHORT', 'Describe the cleanup in at least 10 characters.');
    if (d.length > 2000) throw bad('CLEANUP_DESC_LONG', 'Description is too long.');
    const peserta = Math.round(Number(extra.jumlahPeserta || 1));
    if (!(peserta >= 1 && peserta <= 500)) throw bad('PARTICIPANTS_INVALID', 'Participants must be between 1 and 500.');
    let berat = extra.perkiraanBeratKg === '' || extra.perkiraanBeratKg == null ? null : Number(extra.perkiraanBeratKg);
    if (berat != null && !(berat >= 0 && berat <= 100000)) throw bad('WEIGHT_INVALID', 'Weight must be between 0 and 100000 kg.');
    if (berat != null) berat = Math.round(berat * 10) / 10;
    return { idRelawan, deskripsiKegiatan: d, fotoBeforeUrl, fotoAfterUrl, jumlahPeserta: peserta, perkiraanBeratKg: berat };
  }

  /** simpanLaporanPembersihan(laporan): stores the report and its BuktiPembersihan in one transaction (caller's client). */
  static async simpanLaporanPembersihan(laporan, bukti, client) {
    const q = db(client);
    try {
      const { rows } = await q.query(
        `INSERT INTO laporan_pembersihan (id_klaim, id_relawan, deskripsi_kegiatan, jumlah_peserta, perkiraan_berat_kg)
         VALUES ($1,$2,$3,$4,$5) RETURNING id_pembersihan, kode`,
        [laporan.idKlaim, laporan.idRelawan, laporan.deskripsiKegiatan, laporan.jumlahPeserta, laporan.perkiraanBeratKg]);
      await q.query(
        `INSERT INTO bukti_pembersihan (id_pembersihan, foto_before_url, foto_after_url, gps_before, gps_after,
           sumber_gps_before, sumber_gps_after, jarak_before_m, jarak_after_m)
         VALUES ($1,$2,$3,${pointSql('$4', '$5')},${pointSql('$6', '$7')},$8,$9,$10,$11)`,
        [rows[0].id_pembersihan, laporan.fotoBeforeUrl, laporan.fotoAfterUrl, bukti.before.lon, bukti.before.lat,
          bukti.after.lon, bukti.after.lat, bukti.before.sumber, bukti.after.sumber, bukti.jarakBefore, bukti.jarakAfter]);
      return rows[0];
    } catch (e) {
      if (e.code === '23505') throw conflict('CLEANUP_EXISTS', 'A cleanup report for this claim already exists.');
      throw e;
    }
  }

  static async getDaftarMenungguVerifikasi({ status = 'Menunggu Verifikasi' } = {}, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS} ${FROM} WHERE lp.status_pembersihan = $1 ORDER BY lp.tgl_selesai ${status === 'Menunggu Verifikasi' ? 'ASC' : 'DESC'} LIMIT 200`, [status]);
    return rows.map(toPembersihan);
  }

  static async getDetailPembersihan(idPembersihan, client) {
    const { rows } = await db(client).query(`SELECT ${COLS} ${FROM} WHERE lp.id_pembersihan = $1`, [idPembersihan]);
    if (!rows[0]) throw notFound('CLEANUP_NOT_FOUND', 'Cleanup report not found.');
    return toPembersihan(rows[0]);
  }

  static async getPembersihanSaya(idRelawan, client) {
    const { rows } = await db(client).query(`SELECT ${COLS} ${FROM} WHERE lp.id_relawan = $1 ORDER BY lp.tgl_selesai DESC LIMIT 100`, [idRelawan]);
    return rows.map(toPembersihan);
  }

  /** setHasilVerifikasi(idPembersihan, keputusan): returns the owner and claim ids. Only pending reports can be decided. */
  static async setHasilVerifikasi(idPembersihan, keputusan, idVerifikator, catatan, client) {
    if (!['Disetujui', 'Ditolak'].includes(keputusan)) throw bad('DECISION_INVALID', 'Decision must be approve or reject.');
    const { rows } = await db(client).query(
      `UPDATE laporan_pembersihan SET status_pembersihan = $2, diverifikasi_oleh = $3, diverifikasi_pada = now(), catatan_verifikasi = $4
       WHERE id_pembersihan = $1 AND status_pembersihan = 'Menunggu Verifikasi' RETURNING id_relawan, id_klaim, kode`,
      [idPembersihan, keputusan, idVerifikator, catatan || null]);
    if (!rows[0]) throw conflict('ALREADY_DECIDED', 'This cleanup has already been decided.');
    return { idRelawan: rows[0].id_relawan, idKlaim: rows[0].id_klaim, kode: rows[0].kode };
  }

  static async setPoin(idPembersihan, poin, client) {
    await db(client).query('UPDATE laporan_pembersihan SET poin_diberikan = $2 WHERE id_pembersihan = $1', [idPembersihan, poin]);
  }
}
