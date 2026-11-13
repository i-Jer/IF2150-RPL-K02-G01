// C20 KlaimController: UC04 Mengklaim Titik Pencemaran (KF12, KNF05, R12).
import { KlaimTitikPencemaran } from '../models/KlaimTitikPencemaran.js';
import { LaporanPencemaran } from '../models/LaporanPencemaran.js';
import { AkunRelawan } from '../models/AkunRelawan.js';
import { segarkanPeta } from './VerifikasiController.js';

export class KlaimController {
  /** ambilDetailTitikKlaim(idSesi, idLaporan): point detail plus its claim status. */
  static async ambilDetailTitikKlaim(akun, idLaporan) {
    const detail = await LaporanPencemaran.getDetailPencemaran(idLaporan);
    const klaim = await KlaimTitikPencemaran.getStatusKlaim(detail.idLaporan);
    const klaimSaya = await KlaimTitikPencemaran.getKlaimHidup(akun.idRelawan);
    return {
      detail,
      statusKlaim: klaim ? klaim.statusKlaim : 'Belum diklaim',
      milikSaya: !!klaim && klaim.idRelawan === akun.idRelawan,
      bisaKlaim: detail.statusLaporan === 'Disetujui' && !klaimSaya && akun.peran === 'Relawan',
      klaimSaya,
    };
  }

  /** klaimTitik(idSesi, idLaporan): Algo-003 locking; fails with ALREADY_CLAIMED for the loser of a race. */
  static async klaimTitik(akun, idLaporan) {
    const detail = await LaporanPencemaran.getDetailPencemaran(idLaporan);
    const dataKlaim = AkunRelawan.ajukanKlaimTitik(akun.idRelawan, detail.idLaporan);
    const klaim = await KlaimTitikPencemaran.kunciTitikLokasi(dataKlaim);
    await segarkanPeta('klaim');
    return klaim;
  }

  static async batalkan(akun) {
    const r = await KlaimTitikPencemaran.batalkanKlaim(akun.idRelawan);
    await segarkanPeta('klaim_dibatalkan');
    return { kode: r.kode, statusKlaim: 'Dibatalkan' };
  }
}
