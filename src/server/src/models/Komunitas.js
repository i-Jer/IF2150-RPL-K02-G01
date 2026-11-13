// C09 Komunitas: communities managed by Admin.
import { db } from '../db/pool.js';
import { bad, conflict, notFound } from '../utils/errors.js';

const toKomunitas = (r) => r && ({
  idKomunitas: r.id_komunitas,
  kode: r.kode,
  namaKomunitas: r.nama_komunitas,
  deskripsiKomunitas: r.deskripsi_komunitas,
  wilayah: r.wilayah,
  terverifikasi: r.terverifikasi,
  jumlahAnggota: r.jumlah_anggota ?? undefined,
  totalPoin: r.total_poin ?? undefined,
  dibuat: r.dibuat,
});

const SELECT = `SELECT k.*, (SELECT count(*) FROM akun_relawan a WHERE a.id_komunitas = k.id_komunitas) AS jumlah_anggota,
  (SELECT COALESCE(sum(total_poin),0) FROM akun_relawan a WHERE a.id_komunitas = k.id_komunitas) AS total_poin FROM komunitas k`;

function validasi({ namaKomunitas, deskripsiKomunitas, wilayah }) {
  if (namaKomunitas !== undefined && (typeof namaKomunitas !== 'string' || !namaKomunitas.trim() || namaKomunitas.trim().length > 100)) {
    throw bad('COMMUNITY_NAME_INVALID', 'Community name must be 1 to 100 characters.');
  }
  if (deskripsiKomunitas !== undefined && String(deskripsiKomunitas).length > 1000) throw bad('COMMUNITY_DESC_TOO_LONG', 'Description is too long.');
  if (wilayah !== undefined && String(wilayah).length > 100) throw bad('COMMUNITY_REGION_TOO_LONG', 'Region is too long.');
}

export class Komunitas {
  static async getDaftarKomunitas(client) {
    const { rows } = await db(client).query(`${SELECT} ORDER BY k.nama_komunitas`);
    return rows.map(toKomunitas);
  }

  static async getDetailKomunitas(idTarget, client) {
    const { rows } = await db(client).query(`${SELECT} WHERE k.id_komunitas = $1`, [idTarget]);
    if (!rows[0]) throw notFound('COMMUNITY_NOT_FOUND', 'Community not found.');
    return toKomunitas(rows[0]);
  }

  static async simpanDataKomunitas(data, client) {
    validasi(data);
    if (!data.namaKomunitas) throw bad('COMMUNITY_NAME_INVALID', 'Community name is required.');
    try {
      const { rows } = await db(client).query(
        `INSERT INTO komunitas (nama_komunitas, deskripsi_komunitas, wilayah, terverifikasi) VALUES ($1,$2,$3,$4) RETURNING id_komunitas`,
        [data.namaKomunitas.trim(), (data.deskripsiKomunitas || '').trim(), (data.wilayah || '').trim(), !!data.terverifikasi]);
      return Komunitas.getDetailKomunitas(rows[0].id_komunitas, client);
    } catch (e) {
      if (e.code === '23505') throw conflict('COMMUNITY_EXISTS', 'A community with this name already exists.');
      throw e;
    }
  }

  static async perbaruiKomunitas(idTarget, dataBaru, client) {
    validasi(dataBaru);
    try {
      const { rowCount } = await db(client).query(
        `UPDATE komunitas SET nama_komunitas = COALESCE($2, nama_komunitas), deskripsi_komunitas = COALESCE($3, deskripsi_komunitas),
           wilayah = COALESCE($4, wilayah), terverifikasi = COALESCE($5, terverifikasi), diperbarui = now() WHERE id_komunitas = $1`,
        [idTarget, dataBaru.namaKomunitas?.trim() || null, dataBaru.deskripsiKomunitas ?? null, dataBaru.wilayah ?? null,
          typeof dataBaru.terverifikasi === 'boolean' ? dataBaru.terverifikasi : null]);
      if (!rowCount) throw notFound('COMMUNITY_NOT_FOUND', 'Community not found.');
    } catch (e) {
      if (e.code === '23505') throw conflict('COMMUNITY_EXISTS', 'A community with this name already exists.');
      throw e;
    }
    return true;
  }
}
