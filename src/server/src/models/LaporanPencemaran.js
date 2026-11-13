// C01 LaporanPencemaran: pollution report and its status lifecycle.
import { db } from '../db/pool.js';
import { bad, conflict, notFound } from '../utils/errors.js';
import { pointSql } from '../utils/geo.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const INDIKATOR =['Sehat', 'Waspada', 'Berbahaya'];
export const JENIS_SAMPAH = ['plastik', 'styrofoam', 'jaring', 'logam', 'kaca', 'kayu', 'organik', 'limbah_b3', 'lainnya'];

const COLS = `l.id_laporan, l.kode, l.id_relawan, ST_Y(l.koordinat_gps::geometry) AS lat, ST_X(l.koordinat_gps::geometry) AS lon,
  ST_AsText(l.koordinat_gps) AS wkt, l.sumber_koordinat, l.indikator_tingkat, l.jenis_sampah, l.perkiraan_volume, l.deskripsi,
  l.lokasi_nama, l.tanggal_laporan, l.status_laporan, l.catatan_verifikasi, l.diverifikasi_pada, l.dibersihkan_pada, l.id_klaster`;

export const toLaporan = (r) => r && ({
  idLaporan: r.id_laporan,
  kode: r.kode,
  idRelawan: r.id_relawan,
  koordinatGPS: r.wkt,
  lat: r.lat,
  lon: r.lon,
  sumberKoordinat: r.sumber_koordinat,
  indikatorTingkat: r.indikator_tingkat,
  jenisSampah: r.jenis_sampah || [],
  perkiraanVolume: r.perkiraan_volume,
  deskripsi: r.deskripsi,
  lokasiNama: r.lokasi_nama,
  tanggalLaporan: r.tanggal_laporan,
  statusLaporan: r.status_laporan,
  catatanVerifikasi: r.catatan_verifikasi,
  diverifikasiPada: r.diverifikasi_pada,
  dibersihkanPada: r.dibersihkan_pada,
  idKlaster: r.id_klaster,
  // joined extras (present on some queries)
  fotoUrl: r.foto_url ? `/api/foto/${r.foto_url}` : undefined,
  namaPelapor: r.nama_pelapor,
  heatIntensity: r.heat_intensity != null ? Number(r.heat_intensity) : undefined,
  statusKlaim: r.status_klaim,
  idKlaim: r.id_klaim,
  namaPengklaim: r.nama_pengklaim,
  batasWaktuKlaim: r.batas_waktu,
  idPengklaim: r.id_pengklaim,
});

export class LaporanPencemaran {
  /** buatLaporan(idRelawan, lokasi, indikatorTingkat): new report object with status "Menunggu Verifikasi". */
  static buatLaporan(idRelawan, lokasi, indikatorTingkat, extra = {}) {
    if (!INDIKATOR.includes(indikatorTingkat)) throw bad('INDICATOR_INVALID', 'Choose Healthy, Caution or Dangerous.');
    const jenis = Array.isArray(extra.jenisSampah) ? extra.jenisSampah.filter((j) => JENIS_SAMPAH.includes(j)) : [];
    const deskripsi = String(extra.deskripsi || '').trim();
    if (deskripsi.length > 1000) throw bad('DESCRIPTION_TOO_LONG', 'Description is too long (max 1000 characters).');
    return {
      idRelawan,
      lat: lokasi.lat,
      lon: lokasi.lon,
      sumberKoordinat: ['perangkat', 'exif', 'manual'].includes(extra.sumberKoordinat) ? extra.sumberKoordinat : 'manual',
      indikatorTingkat,
      jenisSampah: jenis,
      perkiraanVolume: ['kecil', 'sedang', 'besar', 'sangat_besar'].includes(extra.perkiraanVolume) ? extra.perkiraanVolume : null,
      deskripsi,
      lokasiNama: String(extra.lokasiNama || '').slice(0, 160),
      statusLaporan: 'Menunggu Verifikasi',
    };
  }

  static async simpanLaporan(laporan, client) {
    const { rows } = await db(client).query(
      `INSERT INTO laporan_pencemaran (id_relawan, koordinat_gps, sumber_koordinat, indikator_tingkat, jenis_sampah, perkiraan_volume, deskripsi, lokasi_nama)
       VALUES ($1, ${pointSql('$2', '$3')}, $4, $5, $6, $7, $8, $9) RETURNING id_laporan, kode`,
      [laporan.idRelawan, laporan.lon, laporan.lat, laporan.sumberKoordinat, laporan.indikatorTingkat, laporan.jenisSampah,
        laporan.perkiraanVolume, laporan.deskripsi, laporan.lokasiNama],
    );
    return rows[0];
  }

  /** getLaporanTerverifikasi(): approved (and claimed) reports shown on the public heatmap. */
  static async getLaporanTerverifikasi(client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS}, p.heat_intensity FROM laporan_pencemaran l LEFT JOIN peta_heatmap p ON p.id_klaster = l.id_klaster
       WHERE l.status_laporan IN ('Disetujui','Diklaim')`);
    return rows.map(toLaporan);
  }

  static async getDetailPencemaran(idLaporan, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS}, b.foto_url, a.nama AS nama_pelapor, p.heat_intensity,
         k.status_klaim, k.id_klaim, k.batas_waktu, k.id_relawan AS id_pengklaim, ka.nama AS nama_pengklaim
       FROM laporan_pencemaran l
       JOIN akun_relawan a ON a.id_relawan = l.id_relawan
       LEFT JOIN LATERAL (SELECT foto_url FROM bukti_laporan WHERE id_laporan = l.id_laporan LIMIT 1) b ON true
       LEFT JOIN peta_heatmap p ON p.id_klaster = l.id_klaster
       LEFT JOIN klaim_titik_pencemaran k ON k.id_laporan = l.id_laporan AND k.status_klaim IN ('Aktif','Menunggu Verifikasi')
       LEFT JOIN akun_relawan ka ON ka.id_relawan = k.id_relawan
       WHERE ${UUID_RE.test(String(idLaporan)) ? 'l.id_laporan = $1::uuid' : 'l.kode = upper($1)'}`, [String(idLaporan)]);
    if (!rows[0]) throw notFound('REPORT_NOT_FOUND', 'Report not found.');
    return toLaporan(rows[0]);
  }

  static async getLokasiGPS(idLaporan, client) {
    const { rows } = await db(client).query('SELECT ST_AsText(koordinat_gps) AS wkt FROM laporan_pencemaran WHERE id_laporan = $1', [idLaporan]);
    return rows[0]?.wkt || null;
  }

  /** getAntreanLaporan(): reports waiting for verification, oldest first (R09 24h SLA). */
  static async getAntreanLaporan({ status = 'Menunggu Verifikasi' } = {}, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS}, b.foto_url, a.nama AS nama_pelapor FROM laporan_pencemaran l
       JOIN akun_relawan a ON a.id_relawan = l.id_relawan
       LEFT JOIN LATERAL (SELECT foto_url FROM bukti_laporan WHERE id_laporan = l.id_laporan LIMIT 1) b ON true
       WHERE l.status_laporan = $1 ORDER BY l.tanggal_laporan ${status === 'Menunggu Verifikasi' ? 'ASC' : 'DESC'} LIMIT 200`, [status]);
    return rows.map(toLaporan);
  }

  /** Pending reports for the public map (R09: shown only as unconfirmed markers, never in heat). */
  static async getLaporanMenunggu(client) {
    const { rows } = await db(client).query(
      `SELECT l.id_laporan, l.kode, ST_Y(l.koordinat_gps::geometry) AS lat, ST_X(l.koordinat_gps::geometry) AS lon, l.indikator_tingkat, l.tanggal_laporan
       FROM laporan_pencemaran l WHERE l.status_laporan = 'Menunggu Verifikasi' LIMIT 5000`);
    return rows.map((r) => ({ idLaporan: r.id_laporan, kode: r.kode, lat: r.lat, lon: r.lon, indikatorTingkat: r.indikator_tingkat, tanggalLaporan: r.tanggal_laporan }));
  }

  static async getLaporanSaya(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT ${COLS}, b.foto_url FROM laporan_pencemaran l
       LEFT JOIN LATERAL (SELECT foto_url FROM bukti_laporan WHERE id_laporan = l.id_laporan LIMIT 1) b ON true
       WHERE l.id_relawan = $1 ORDER BY l.tanggal_laporan DESC LIMIT 200`, [idRelawan]);
    return rows.map(toLaporan);
  }

  /** perbaruiStatusLaporan(idLaporan, status): only a pending report can be decided (no double decisions). */
  static async perbaruiStatusLaporan(idLaporan, status, idVerifikator, catatan, client) {
    if (!['Disetujui', 'Ditolak'].includes(status)) throw bad('DECISION_INVALID', 'Decision must be approve or reject.');
    const { rows } = await db(client).query(
      `UPDATE laporan_pencemaran SET status_laporan = $2, diverifikasi_oleh = $3, diverifikasi_pada = now(), catatan_verifikasi = $4
       WHERE id_laporan = $1 AND status_laporan = 'Menunggu Verifikasi' RETURNING id_relawan, kode`,
      [idLaporan, status, idVerifikator, catatan || null]);
    if (!rows[0]) throw conflict('ALREADY_DECIDED', 'This report has already been decided.');
    return rows[0];
  }

  static async setStatusDiklaim(idLaporan, client) {
    await db(client).query(`UPDATE laporan_pencemaran SET status_laporan = 'Diklaim' WHERE id_laporan = $1`, [idLaporan]);
    return true;
  }

  static async setStatusDibersihkan(idLaporan, client) {
    await db(client).query(`UPDATE laporan_pencemaran SET status_laporan = 'Dibersihkan', dibersihkan_pada = now() WHERE id_laporan = $1`, [idLaporan]);
    return true;
  }

  /** Back to "Disetujui" when a claim expires or is released. */
  static async lepasKlaim(idLaporan, client) {
    await db(client).query(`UPDATE laporan_pencemaran SET status_laporan = 'Disetujui' WHERE id_laporan = $1 AND status_laporan = 'Diklaim'`, [idLaporan]);
  }

  /** Public numbers for the summary panel and landing page. */
  static async getRingkasan(client) {
    const { rows } = await db(client).query(
      `SELECT
         count(*) FILTER (WHERE status_laporan IN ('Disetujui','Diklaim')) AS aktif,
         count(*) FILTER (WHERE status_laporan IN ('Disetujui','Diklaim') AND indikator_tingkat = 'Sehat') AS sehat,
         count(*) FILTER (WHERE status_laporan IN ('Disetujui','Diklaim') AND indikator_tingkat = 'Waspada') AS waspada,
         count(*) FILTER (WHERE status_laporan IN ('Disetujui','Diklaim') AND indikator_tingkat = 'Berbahaya') AS berbahaya,
         count(*) FILTER (WHERE status_laporan = 'Diklaim') AS diklaim,
         count(*) FILTER (WHERE status_laporan = 'Dibersihkan') AS dibersihkan,
         count(*) FILTER (WHERE status_laporan = 'Menunggu Verifikasi') AS menunggu,
         (SELECT count(*) FROM akun_relawan WHERE peran = 'Relawan' AND status_akun = 'Aktif') AS relawan,
         (SELECT COALESCE(sum(perkiraan_berat_kg),0) FROM laporan_pembersihan WHERE status_pembersihan = 'Disetujui') AS berat_kg
       FROM laporan_pencemaran`);
    const r = rows[0];
    return {
      aktif: r.aktif, sehat: r.sehat, waspada: r.waspada, berbahaya: r.berbahaya, diklaim: r.diklaim,
      dibersihkan: r.dibersihkan, menunggu: r.menunggu, relawan: r.relawan, beratKg: r.berat_kg,
    };
  }
}
