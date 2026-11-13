// C23 AdminController: UC08 Mengelola Akun Relawan dan Data Komunitas (KF20, KF21, R23, R24).
import { withTransaction } from '../db/pool.js';
import { AkunRelawan } from '../models/AkunRelawan.js';
import { Komunitas } from '../models/Komunitas.js';
import { LogVerifikasi } from '../models/LogVerifikasi.js';
import { Notifikasi } from '../services/Notifikasi.js';
import { bad, forbidden } from '../utils/errors.js';

export class AdminController {
  static async ambilDataAkunDanKomunitas(q = {}) {
    const [daftarAkun, daftarKomunitas] = await Promise.all([AkunRelawan.getDaftarAkun(q), Komunitas.getDaftarKomunitas()]);
    return { daftarAkun, daftarKomunitas };
  }

  static async ambilDetailEntitas(idTarget, tipeEntitas) {
    if (tipeEntitas === 'akun') {
      const akun = await AkunRelawan.getDetailAkun(idTarget);
      if (!akun) throw bad('ACCOUNT_NOT_FOUND', 'Account not found.');
      const [statistik, teguran] = await Promise.all([AkunRelawan.getStatistik(idTarget), AkunRelawan.getTeguran(idTarget)]);
      return { tipe: 'akun', akun, statistik, teguran };
    }
    if (tipeEntitas === 'komunitas') return { tipe: 'komunitas', komunitas: await Komunitas.getDetailKomunitas(idTarget) };
    throw bad('ENTITY_INVALID', 'Unknown entity type.');
  }

  /**
   * prosesPerubahanData(idSesi, idTarget, tipeEntitas, dataBaru): atomic; an admin cannot demote or suspend
   * themself; Verifikator/Admin roles require a verified institution (R24).
   */
  static async prosesPerubahanData(akunAdmin, idTarget, tipeEntitas, dataBaru = {}) {
    if (tipeEntitas === 'komunitas') {
      return withTransaction(async (c) => {
        const baru = idTarget === 'baru';
        let id = idTarget;
        if (baru) id = (await Komunitas.simpanDataKomunitas(dataBaru, c)).idKomunitas;
        else await Komunitas.perbaruiKomunitas(idTarget, dataBaru, c);
        const k = await Komunitas.getDetailKomunitas(id, c);
        await LogVerifikasi.catatLogAdmin(akunAdmin.idRelawan, 'komunitas', id, k.kode, baru ? 'Dibuat' : 'Diperbarui', null, c);
        return { tipe: 'komunitas', komunitas: k };
      });
    }
    if (tipeEntitas !== 'akun') throw bad('ENTITY_INVALID', 'Unknown entity type.');
    const diriSendiri = idTarget === akunAdmin.idRelawan;
    const notifs = [];
    const hasil = await withTransaction(async (c) => {
      const lama = await AkunRelawan.getDetailAkun(idTarget, c);
      if (!lama) throw bad('ACCOUNT_NOT_FOUND', 'Account not found.');
      if (lama.peran === 'Admin' && akunAdmin.peran !== 'Admin') throw forbidden('ADMIN_ONLY', 'Only an Admin can change an Admin account.');
      const catatan = [];
      if (dataBaru.nama !== undefined || dataBaru.email !== undefined || dataBaru.idKomunitas !== undefined) {
        await AkunRelawan.perbaruiDataAkun(idTarget, { nama: dataBaru.nama, email: dataBaru.email, idKomunitas: dataBaru.idKomunitas }, c);
        catatan.push('data');
      }
      if (dataBaru.peran && dataBaru.peran !== lama.peran) {
        if (diriSendiri) throw forbidden('SELF_ROLE', 'You cannot change your own role.');
        if (dataBaru.peran === 'Admin' && akunAdmin.peran !== 'Admin') throw forbidden('ADMIN_ONLY', 'Only an Admin can grant the Admin role.');
        if (dataBaru.peran !== 'Relawan') {
          const inst = String(dataBaru.instansi || lama.instansi || '').trim();
          if (!dataBaru.instansiTerverifikasi || inst.length < 3) {
            throw bad('INSTITUTION_REQUIRED', 'Verifier roles need a verified institution (e.g. Dinas Lingkungan Hidup).');
          }
          dataBaru.instansi = inst;
        }
        await AkunRelawan.ubahHakAkses(idTarget, dataBaru.peran, dataBaru.instansi, c);
        catatan.push(`peran:${lama.peran}->${dataBaru.peran}`);
        notifs.push(await Notifikasi.kirimNotifikasi(idTarget, {
          jenis: 'peran_diubah', judul: `Your role is now ${dataBaru.peran}`, pesan: 'Sign in again to see the new menus.', data: { peran: dataBaru.peran },
        }, c));
      }
      if (dataBaru.statusAkun && dataBaru.statusAkun !== lama.statusAkun) {
        if (diriSendiri) throw forbidden('SELF_SUSPEND', 'You cannot suspend your own account.');
        if (dataBaru.statusAkun === 'Ditangguhkan') await AkunRelawan.tangguhkanAkun(idTarget, c);
        else if (dataBaru.statusAkun === 'Aktif') await AkunRelawan.aktifkanAkun(idTarget, c);
        else throw bad('STATUS_INVALID', 'Unknown account status.');
        catatan.push(`status:${dataBaru.statusAkun}`);
      }
      if (!catatan.length) throw bad('NOTHING_CHANGED', 'Nothing to save.');
      await LogVerifikasi.catatLogAdmin(akunAdmin.idRelawan, 'akun', idTarget, lama.kode, 'Diperbarui', catatan.join('; '), c);
      return { tipe: 'akun', akun: await AkunRelawan.getDetailAkun(idTarget, c) };
    });
    for (const n of notifs) Notifikasi.dorong(idTarget, n);
    if (dataBaru.statusAkun) Notifikasi.siarkan('leaderboard', { waktu: new Date().toISOString() });
    return hasil;
  }
}
