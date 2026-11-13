// C08 AkunRelawan: account profile, role, status and points.
import { db } from '../db/pool.js';
import { bad, conflict, notFound } from '../utils/errors.js';

const PUBLIC_COLS = `a.id_relawan, a.kode, a.nama, a.email, a.peran, a.status_akun, a.total_poin,
  a.id_komunitas, k.nama_komunitas, a.instansi, a.jumlah_teguran, a.bahasa, a.dibuat`;

export const toAkun = (r) => r && ({
  idRelawan: r.id_relawan,
  kode: r.kode,
  nama: r.nama,
  email: r.email,
  peran: r.peran,
  statusAkun: r.status_akun,
  totalPoin: r.total_poin,
  idKomunitas: r.id_komunitas,
  namaKomunitas: r.nama_komunitas || null,
  instansi: r.instansi || null,
  jumlahTeguran: r.jumlah_teguran,
  bahasa: r.bahasa,
  dibuat: r.dibuat,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class AkunRelawan {
  static validasiData({ nama, email }) {
    if (nama !== undefined && (typeof nama !== 'string' || nama.trim().length < 2 || nama.trim().length > 80)) {
      throw bad('NAME_INVALID', 'Name must be 2 to 80 characters.');
    }
    if (email !== undefined && (typeof email !== 'string' || !EMAIL_RE.test(email.trim()))) {
      throw bad('EMAIL_INVALID', 'Enter a valid email address.');
    }
  }

  static async buatAkun({ nama, email, passwordHash, bahasa = 'en', idKomunitas = null }, client) {
    AkunRelawan.validasiData({ nama, email });
    try {
      const { rows } = await db(client).query(
        `INSERT INTO akun_relawan (nama, email, password_hash, bahasa, id_komunitas)
         VALUES ($1, lower($2), $3, $4, $5) RETURNING id_relawan`,
        [nama.trim(), email.trim(), passwordHash, bahasa === 'id' ? 'id' : 'en', idKomunitas],
      );
      return AkunRelawan.getDetailAkun(rows[0].id_relawan, client);
    } catch (e) {
      if (e.code === '23505') throw conflict('EMAIL_TAKEN', 'An account with this email already exists.');
      throw e;
    }
  }

  static async cariDenganEmail(email, client) {
    const { rows } = await db(client).query('SELECT * FROM akun_relawan WHERE lower(email) = lower($1)', [String(email || '').trim()]);
    return rows[0] || null;
  }

  /** getDetailAkun(idTarget) */
  static async getDetailAkun(idTarget, client) {
    const { rows } = await db(client).query(
      `SELECT ${PUBLIC_COLS} FROM akun_relawan a LEFT JOIN komunitas k ON k.id_komunitas = a.id_komunitas
       WHERE a.id_relawan = $1`, [idTarget],
    );
    return toAkun(rows[0]);
  }

  /** getDataRelawan(idLaporan): reporter of a report. */
  static async getDataRelawan(idLaporan, client) {
    const { rows } = await db(client).query(
      `SELECT ${PUBLIC_COLS} FROM laporan_pencemaran l JOIN akun_relawan a ON a.id_relawan = l.id_relawan
       LEFT JOIN komunitas k ON k.id_komunitas = a.id_komunitas WHERE l.id_laporan = $1`, [idLaporan],
    );
    return toAkun(rows[0]);
  }

  /** ajukanKlaimTitik(idRelawan, idLaporan): build claim data on behalf of the volunteer. */
  static ajukanKlaimTitik(idRelawan, idLaporan) {
    return { idRelawan, idLaporan };
  }

  /**
   * Algo-007 tambahSkorPoin(idRelawan, idPembersihan): points = max(1, round(heat of the
   * cluster around the claimed point)) via Q-006 (ST_DWithin), then Q-007 UPDATE ... RETURNING.
   */
  static async tambahSkorPoin(idRelawan, idPembersihan, radiusKlaster, client) {
    const q = db(client);
    const heat = await q.query(
      `SELECT p.heat_intensity FROM laporan_pembersihan lp
       JOIN klaim_titik_pencemaran k ON k.id_klaim = lp.id_klaim
       JOIN peta_heatmap p ON ST_DWithin(p.koordinat_pusat, k.koordinat_titik, $2)
       WHERE lp.id_pembersihan = $1
       ORDER BY ST_Distance(p.koordinat_pusat, k.koordinat_titik) LIMIT 1`,
      [idPembersihan, radiusKlaster],
    );
    const poin = Math.max(1, Math.round(heat.rows[0]?.heat_intensity || 1));
    const { rows } = await q.query(
      'UPDATE akun_relawan SET total_poin = total_poin + $1, diperbarui = now() WHERE id_relawan = $2 RETURNING total_poin',
      [poin, idRelawan],
    );
    await q.query('INSERT INTO riwayat_poin (id_relawan, id_pembersihan, poin) VALUES ($1, $2, $3)', [idRelawan, idPembersihan, poin]);
    return { poin, totalPoinBaru: rows[0].total_poin };
  }

  static async getAtributPoin(idRelawan, client) {
    const { rows } = await db(client).query('SELECT total_poin FROM akun_relawan WHERE id_relawan = $1', [idRelawan]);
    return rows[0]?.total_poin ?? 0;
  }

  /** getDaftarAkun(): all accounts, optionally filtered by search text / role / status. */
  static async getDaftarAkun({ cari = '', peran = '', status = '' } = {}, client) {
    const where = [];
    const params = [];
    if (cari) { params.push(`%${cari}%`); where.push(`(a.nama ILIKE $${params.length} OR a.email ILIKE $${params.length} OR a.kode ILIKE $${params.length})`); }
    if (peran) { params.push(peran); where.push(`a.peran = $${params.length}`); }
    if (status) { params.push(status); where.push(`a.status_akun = $${params.length}`); }
    const { rows } = await db(client).query(
      `SELECT ${PUBLIC_COLS} FROM akun_relawan a LEFT JOIN komunitas k ON k.id_komunitas = a.id_komunitas
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.dibuat DESC LIMIT 500`, params,
    );
    return rows.map(toAkun);
  }

  static async ubahHakAkses(idTarget, peranBaru, instansi, client) {
    if (!['Relawan', 'Verifikator', 'Admin'].includes(peranBaru)) throw bad('ROLE_INVALID', 'Unknown role.');
    const { rowCount } = await db(client).query(
      `UPDATE akun_relawan SET peran = $2, instansi = CASE WHEN $2 = 'Relawan' THEN instansi ELSE $3 END, diperbarui = now()
       WHERE id_relawan = $1`, [idTarget, peranBaru, instansi || null],
    );
    if (!rowCount) throw notFound('ACCOUNT_NOT_FOUND', 'Account not found.');
    return true;
  }

  static async tangguhkanAkun(idTarget, client) {
    const q = db(client);
    const { rowCount } = await q.query(
      `UPDATE akun_relawan SET status_akun = 'Ditangguhkan', diperbarui = now() WHERE id_relawan = $1`, [idTarget],
    );
    if (!rowCount) throw notFound('ACCOUNT_NOT_FOUND', 'Account not found.');
    await q.query('DELETE FROM sesi WHERE id_relawan = $1', [idTarget]); // revoke every session
    return true;
  }

  static async aktifkanAkun(idTarget, client) {
    const { rowCount } = await db(client).query(
      `UPDATE akun_relawan SET status_akun = 'Aktif', jumlah_gagal_login = 0, waktu_kunci = NULL, diperbarui = now()
       WHERE id_relawan = $1`, [idTarget],
    );
    if (!rowCount) throw notFound('ACCOUNT_NOT_FOUND', 'Account not found.');
    return true;
  }

  static async perbaruiDataAkun(idTarget, { nama, email, idKomunitas, bahasa }, client) {
    AkunRelawan.validasiData({ nama, email });
    try {
      const { rowCount } = await db(client).query(
        `UPDATE akun_relawan SET
           nama = COALESCE($2, nama),
           email = COALESCE(lower($3), email),
           id_komunitas = CASE WHEN $4::boolean THEN $5::uuid ELSE id_komunitas END,
           bahasa = COALESCE($6, bahasa),
           diperbarui = now()
         WHERE id_relawan = $1`,
        [idTarget, nama?.trim() || null, email?.trim() || null, idKomunitas !== undefined, idKomunitas || null,
          bahasa === 'id' || bahasa === 'en' ? bahasa : null],
      );
      if (!rowCount) throw notFound('ACCOUNT_NOT_FOUND', 'Account not found.');
    } catch (e) {
      if (e.code === '23505') throw conflict('EMAIL_TAKEN', 'An account with this email already exists.');
      if (e.code === '23503') throw bad('COMMUNITY_INVALID', 'Community not found.');
      throw e;
    }
    return true;
  }

  static async setPassword(idRelawan, passwordHash, client) {
    await db(client).query('UPDATE akun_relawan SET password_hash = $2, diperbarui = now() WHERE id_relawan = $1', [idRelawan, passwordHash]);
  }

  /** R18: warn an account for manipulated evidence. */
  static async beriTeguran(idRelawan, idVerifikator, alasan, kodeObjek, client) {
    const q = db(client);
    await q.query('INSERT INTO teguran (id_relawan, id_verifikator, alasan, kode_objek) VALUES ($1,$2,$3,$4)',
      [idRelawan, idVerifikator, alasan, kodeObjek]);
    const { rows } = await q.query(
      'UPDATE akun_relawan SET jumlah_teguran = jumlah_teguran + 1 WHERE id_relawan = $1 RETURNING jumlah_teguran', [idRelawan]);
    return rows[0]?.jumlah_teguran ?? 0;
  }

  static async getTeguran(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT t.id_teguran, t.alasan, t.kode_objek, t.dibuat, v.nama AS nama_verifikator
       FROM teguran t JOIN akun_relawan v ON v.id_relawan = t.id_verifikator
       WHERE t.id_relawan = $1 ORDER BY t.dibuat DESC`, [idRelawan]);
    return rows.map((r) => ({ id: r.id_teguran, alasan: r.alasan, kodeObjek: r.kode_objek, dibuat: r.dibuat, namaVerifikator: r.nama_verifikator }));
  }

  /** Personal stats for the profile screen. */
  static async getStatistik(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT
         (SELECT count(*) FROM laporan_pencemaran WHERE id_relawan = $1) AS laporan,
         (SELECT count(*) FROM laporan_pencemaran WHERE id_relawan = $1 AND status_laporan <> 'Menunggu Verifikasi' AND status_laporan <> 'Ditolak') AS laporan_sah,
         (SELECT count(*) FROM laporan_pembersihan WHERE id_relawan = $1 AND status_pembersihan = 'Disetujui') AS pembersihan,
         (SELECT COALESCE(sum(perkiraan_berat_kg),0) FROM laporan_pembersihan WHERE id_relawan = $1 AND status_pembersihan = 'Disetujui') AS berat_kg`,
      [idRelawan]);
    const r = rows[0];
    return { laporan: r.laporan, laporanSah: r.laporan_sah, pembersihan: r.pembersihan, beratKg: r.berat_kg };
  }
}
