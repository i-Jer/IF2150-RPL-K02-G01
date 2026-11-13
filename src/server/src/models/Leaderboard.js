// C07 Leaderboard: volunteer and community rankings (Algo-008 / Q-008).
import { db } from '../db/pool.js';

const PERIODE = {
  semua: null,
  bulan: "date_trunc('month', now())",
  minggu: "date_trunc('week', now())",
};

export class Leaderboard {
  /** Algo-008 hitungUlangPeringkat(): recomputes the ranking and stamps tglPembaruan. */
  static async hitungUlangPeringkat(client) {
    const q = db(client);
    const { rows } = await q.query('UPDATE leaderboard SET tgl_pembaruan = now() WHERE id_leaderboard = 1 RETURNING tgl_pembaruan');
    const daftarPeringkat = await Leaderboard.getDaftarPeringkat({ limit: 10 }, client);
    return { daftarPeringkat, tglPembaruan: rows[0].tgl_pembaruan };
  }

  /** Q-008 getDaftarPeringkat(): active volunteers ordered by points, RANK() OVER for ties. */
  static async getDaftarPeringkat({ periode = 'semua', limit = 100, idKomunitas = null } = {}, client) {
    const since = PERIODE[periode] ?? null;
    const params = [Math.min(Number(limit) || 100, 500)];
    let filterKom = '';
    if (idKomunitas) { params.push(idKomunitas); filterKom = `AND a.id_komunitas = $${params.length}`; }
    const poinExpr = since
      ? `COALESCE((SELECT sum(r.poin) FROM riwayat_poin r WHERE r.id_relawan = a.id_relawan AND r.dibuat >= ${since}), 0)`
      : 'a.total_poin';
    const { rows } = await db(client).query(
      `SELECT * FROM (
         SELECT a.id_relawan, a.kode, a.nama, ${poinExpr}::int AS total_poin, k.nama_komunitas,
           (SELECT count(*) FROM riwayat_poin rp WHERE rp.id_relawan = a.id_relawan AND rp.poin > 0)::int AS jumlah_pembersihan,
           RANK() OVER (ORDER BY ${poinExpr} DESC) AS peringkat
         FROM akun_relawan a LEFT JOIN komunitas k ON k.id_komunitas = a.id_komunitas
         WHERE a.peran = 'Relawan' AND a.status_akun = 'Aktif' ${filterKom}
       ) t ORDER BY peringkat, nama LIMIT $1`, params);
    return rows.map((r) => ({
      idRelawan: r.id_relawan, kode: r.kode, nama: r.nama, totalPoin: r.total_poin, namaKomunitas: r.nama_komunitas,
      jumlahPembersihan: r.jumlah_pembersihan, peringkat: Number(r.peringkat),
    }));
  }

  /** getPosisiPengguna(idRelawan): rank and points of one volunteer (null when not ranked, e.g. verifiers). */
  static async getPosisiPengguna(idRelawan, { periode = 'semua' } = {}, client) {
    const since = PERIODE[periode] ?? null;
    const poinExpr = since
      ? `COALESCE((SELECT sum(r.poin) FROM riwayat_poin r WHERE r.id_relawan = a.id_relawan AND r.dibuat >= ${since}), 0)`
      : 'a.total_poin';
    const { rows } = await db(client).query(
      `SELECT * FROM (
         SELECT a.id_relawan, ${poinExpr}::int AS total_poin, RANK() OVER (ORDER BY ${poinExpr} DESC) AS peringkat,
           count(*) OVER () AS jumlah
         FROM akun_relawan a WHERE a.peran = 'Relawan' AND a.status_akun = 'Aktif'
       ) t WHERE id_relawan = $1`, [idRelawan]);
    return rows[0] ? { peringkat: Number(rows[0].peringkat), totalPoin: rows[0].total_poin, dari: Number(rows[0].jumlah) } : null;
  }

  /** Community leaderboard (R20: "leaderboard relawan atau komunitas"). */
  static async getPeringkatKomunitas({ limit = 50 } = {}, client) {
    const { rows } = await db(client).query(
      `SELECT k.id_komunitas, k.kode, k.nama_komunitas, k.wilayah, count(a.id_relawan)::int AS anggota,
         COALESCE(sum(a.total_poin),0)::int AS total_poin, RANK() OVER (ORDER BY COALESCE(sum(a.total_poin),0) DESC) AS peringkat
       FROM komunitas k LEFT JOIN akun_relawan a ON a.id_komunitas = k.id_komunitas AND a.status_akun = 'Aktif' AND a.peran = 'Relawan'
       GROUP BY k.id_komunitas ORDER BY peringkat, k.nama_komunitas LIMIT $1`, [limit]);
    return rows.map((r) => ({
      idKomunitas: r.id_komunitas, kode: r.kode, namaKomunitas: r.nama_komunitas, wilayah: r.wilayah,
      anggota: r.anggota, totalPoin: r.total_poin, peringkat: Number(r.peringkat),
    }));
  }

  static async getTglPembaruan(client) {
    const { rows } = await db(client).query('SELECT tgl_pembaruan FROM leaderboard WHERE id_leaderboard = 1');
    return rows[0]?.tgl_pembaruan || null;
  }
}
