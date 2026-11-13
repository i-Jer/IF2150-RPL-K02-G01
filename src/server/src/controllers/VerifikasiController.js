// C19 VerifikasiController: UC03 (verify reports) and UC06 (verify cleanups), Algo-006.
import { withTransaction } from '../db/pool.js';
import { config } from '../config.js';
import { LaporanPencemaran } from '../models/LaporanPencemaran.js';
import { BuktiLaporan } from '../models/BuktiLaporan.js';
import { LaporanPembersihan } from '../models/LaporanPembersihan.js';
import { BuktiPembersihan } from '../models/BuktiPembersihan.js';
import { KlaimTitikPencemaran } from '../models/KlaimTitikPencemaran.js';
import { LogVerifikasi } from '../models/LogVerifikasi.js';
import { AkunRelawan } from '../models/AkunRelawan.js';
import { Leaderboard } from '../models/Leaderboard.js';
import { PetaHeatmap } from '../models/PetaHeatmap.js';
import { Notifikasi } from '../services/Notifikasi.js';
import { bad } from '../utils/errors.js';

const keputusanDari = (v) => {
  const s = String(v || '').toLowerCase();
  if (['disetujui', 'setujui', 'approve', 'approved'].includes(s)) return 'Disetujui';
  if (['ditolak', 'tolak', 'reject', 'rejected'].includes(s)) return 'Ditolak';
  throw bad('DECISION_INVALID', 'Decision must be approve or reject.');
};

function cekCatatan(keputusan, catatan, teguran) {
  const c = String(catatan || '').trim();
  if (keputusan === 'Ditolak' && c.length < 5) throw bad('REASON_REQUIRED', 'Give a short reason when rejecting.');
  if (c.length > 500) throw bad('REASON_TOO_LONG', 'Reason is too long.');
  if (teguran && keputusan !== 'Ditolak') throw bad('WARNING_ONLY_ON_REJECT', 'A warning can only accompany a rejection.');
  return c || null;
}

/** Recompute clusters and tell every open map/board to refresh (KNF08 <= 10 s). */
export async function segarkanPeta(alasan) {
  try {
    await PetaHeatmap.hitungHeatIntensity();
    Notifikasi.siarkan('heatmap', { alasan, waktu: new Date().toISOString() });
  } catch (e) {
    console.error('[heatmap] recompute failed', e.message);
  }
}

export class VerifikasiController {
  static async ambilAntreanLaporan({ status } = {}) {
    return LaporanPencemaran.getAntreanLaporan({ status: status || 'Menunggu Verifikasi' });
  }

  static async ambilDetailLaporan(idLaporan) {
    const detailLaporan = await LaporanPencemaran.getDetailPencemaran(idLaporan);
    const [detailBukti, dataPelapor] = await Promise.all([
      BuktiLaporan.getDetailBukti(detailLaporan.idLaporan),
      AkunRelawan.getDataRelawan(detailLaporan.idLaporan),
    ]);
    return { detailLaporan, detailBukti, dataPelapor };
  }

  /** prosesVerifikasiLaporan(idSesi, idLaporan, status): status, audit log, notification. */
  static async prosesVerifikasiLaporan(akun, idLaporan, { keputusan, catatan, teguran }) {
    const status = keputusanDari(keputusan);
    const cat = cekCatatan(status, catatan, teguran);
    const { notif, idRelawan, kode } = await withTransaction(async (c) => {
      const lap = await LaporanPencemaran.perbaruiStatusLaporan(idLaporan, status, akun.idRelawan, cat, c);
      await LogVerifikasi.catatLogVerifikasi(akun.idRelawan, idLaporan, lap.kode, status, cat, c);
      if (teguran) await AkunRelawan.beriTeguran(lap.id_relawan, akun.idRelawan, cat, lap.kode, c);
      const n = await Notifikasi.kirimNotifikasi(lap.id_relawan, {
        jenis: status === 'Disetujui' ? 'laporan_disetujui' : 'laporan_ditolak',
        judul: status === 'Disetujui' ? `Report ${lap.kode} approved` : `Report ${lap.kode} rejected`,
        pesan: status === 'Disetujui' ? 'Your report is now on the public heatmap.' : (cat || 'Your report was rejected.'),
        tautan: `/laporan-saya`,
        data: { kode: lap.kode, idLaporan, catatan: cat, teguran: !!teguran },
      }, c);
      return { notif: n, idRelawan: lap.id_relawan, kode: lap.kode };
    });
    Notifikasi.dorong(idRelawan, notif);
    Notifikasi.siarkanVerifikator('antrean', { jenis: 'laporan', kode });
    if (status === 'Disetujui') await segarkanPeta('laporan_disetujui');
    return { status, kode };
  }

  static async ambilDaftarPengajuan({ status } = {}) {
    return LaporanPembersihan.getDaftarMenungguVerifikasi({ status: status || 'Menunggu Verifikasi' });
  }

  static async ambilDetailPengajuan(idPembersihan) {
    const detailPembersihan = await LaporanPembersihan.getDetailPembersihan(idPembersihan);
    const fotoBeforeAfter = await BuktiPembersihan.tampilkanPerbandinganFoto(idPembersihan);
    const fotoLaporan = await BuktiLaporan.getDetailBukti(detailPembersihan.idLaporan);
    const klaster = await PetaHeatmap.getDetailKlaster({ lat: detailPembersihan.lat, lon: detailPembersihan.lon });
    return { detailPembersihan, fotoBeforeAfter, fotoLaporan: fotoLaporan[0] || null, perkiraanPoin: klaster ? Math.max(1, Math.round(klaster.heatIntensity)) : 1 };
  }

  /** Algo-006 prosesVerifikasiPembersihan(idSesi, idPembersihan, keputusan). */
  static async prosesVerifikasiPembersihan(akun, idPembersihan, { keputusan, catatan, teguran }) {
    const status = keputusanDari(keputusan);
    const cat = cekCatatan(status, catatan, teguran);
    const hasil = await withTransaction(async (c) => {
      const { idRelawan, idKlaim, kode } = await LaporanPembersihan.setHasilVerifikasi(idPembersihan, status, akun.idRelawan, cat, c);
      await LogVerifikasi.catatLogAudit(akun.idRelawan, idPembersihan, kode, status, cat, c);
      const { rows } = await c.query('SELECT id_laporan FROM klaim_titik_pencemaran WHERE id_klaim = $1', [idKlaim]);
      const idLaporan = rows[0].id_laporan;
      let poin = 0; let totalPoinBaru = null;
      if (status === 'Disetujui') {
        ({ poin, totalPoinBaru } = await AkunRelawan.tambahSkorPoin(idRelawan, idPembersihan, config.rules.clusterRadius, c));
        await LaporanPembersihan.setPoin(idPembersihan, poin, c);
        await KlaimTitikPencemaran.ubahStatusKlaim(idKlaim, 'Selesai', c);
        await LaporanPencemaran.setStatusDibersihkan(idLaporan, c);
        await Leaderboard.hitungUlangPeringkat(c);
      } else {
        // Rejected: the claim goes back to Aktif (with at least 2 days left) so proof can be resubmitted.
        await c.query(
          `UPDATE klaim_titik_pencemaran SET status_klaim = 'Aktif', batas_waktu = GREATEST(batas_waktu, now() + interval '2 days'), diperbarui = now()
           WHERE id_klaim = $1`, [idKlaim]);
        if (teguran) await AkunRelawan.beriTeguran(idRelawan, akun.idRelawan, cat, kode, c);
      }
      const n = await Notifikasi.kirimNotifikasi(idRelawan, {
        jenis: status === 'Disetujui' ? 'pembersihan_disetujui' : 'pembersihan_ditolak',
        judul: status === 'Disetujui' ? `Cleanup ${kode} approved: +${poin} points` : `Cleanup ${kode} rejected`,
        pesan: status === 'Disetujui' ? `You now have ${totalPoinBaru} points.` : (cat || 'Your cleanup proof was rejected.'),
        tautan: status === 'Disetujui' ? '/leaderboard' : '/pembersihan',
        data: { kode, poin, totalPoinBaru, catatan: cat, teguran: !!teguran },
      }, c);
      return { idRelawan, kode, poin, totalPoinBaru, notif: n };
    });
    Notifikasi.dorong(hasil.idRelawan, hasil.notif);
    Notifikasi.siarkanVerifikator('antrean', { jenis: 'pembersihan', kode: hasil.kode });
    if (status === 'Disetujui') {
      Notifikasi.siarkan('leaderboard', { idRelawan: hasil.idRelawan, poin: hasil.poin, waktu: new Date().toISOString() });
      await segarkanPeta('pembersihan_disetujui');
    }
    return { status, kode: hasil.kode, poin: hasil.poin, totalPoinBaru: hasil.totalPoinBaru };
  }

  static async ambilLog(q) {
    return LogVerifikasi.getLog(q);
  }
}
