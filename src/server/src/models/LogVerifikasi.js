// C06 LogVerifikasi: append-only audit trail (KF17, KNF07). The DB trigger rejects UPDATE/DELETE.
import { db } from '../db/pool.js';

export class LogVerifikasi {
  /** catatLogVerifikasi(idVerifikator, idLaporan, status): report decisions. */
  static async catatLogVerifikasi(idVerifikator, idLaporan, kode, status, catatan, client) {
    return LogVerifikasi.#insert(idVerifikator, 'laporan', idLaporan, kode, status, catatan, client);
  }

  /** Algo-009 catatLogAudit(idVerifikator, idPembersihan, keputusan): cleanup decisions (Q-009). */
  static async catatLogAudit(idVerifikator, idPembersihan, kode, keputusan, catatan, client) {
    return LogVerifikasi.#insert(idVerifikator, 'pembersihan', idPembersihan, kode, keputusan, catatan, client);
  }

  /** Admin actions on accounts/communities are audited the same way. */
  static async catatLogAdmin(idAdmin, jenis, idObjek, kode, keputusan, catatan, client) {
    return LogVerifikasi.#insert(idAdmin, jenis, idObjek, kode, keputusan, catatan, client);
  }

  static async #insert(idVerifikator, jenis, idObjek, kode, status, catatan, client) {
    const { rows } = await db(client).query(
      `INSERT INTO log_verifikasi (id_verifikator, jenis_objek, id_objek, kode_objek, status_keputusan, catatan)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_log, timestamp`,
      [idVerifikator, jenis, idObjek, kode, status, catatan || null]);
    return rows[0];
  }

  static async getLog({ limit = 100, jenis } = {}, client) {
    const params = [Math.min(Number(limit) || 100, 500)];
    let where = '';
    if (jenis) { params.push(jenis); where = 'WHERE g.jenis_objek = $2'; }
    const { rows } = await db(client).query(
      `SELECT g.id_log, g.jenis_objek, g.kode_objek, g.status_keputusan, g.catatan, g.timestamp, a.nama AS nama_verifikator, a.kode AS kode_verifikator
       FROM log_verifikasi g JOIN akun_relawan a ON a.id_relawan = g.id_verifikator ${where} ORDER BY g.id_log DESC LIMIT $1`, params);
    return rows.map((r) => ({
      idLog: r.id_log, jenisObjek: r.jenis_objek, kodeObjek: r.kode_objek, statusKeputusan: r.status_keputusan,
      catatan: r.catatan, timestamp: r.timestamp, namaVerifikator: r.nama_verifikator, kodeVerifikator: r.kode_verifikator,
    }));
  }
}
