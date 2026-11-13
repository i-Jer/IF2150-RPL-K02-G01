// C22 LeaderboardController: UC07 Melihat Leaderboard (KF18, KF19).
import { Leaderboard } from '../models/Leaderboard.js';

const periodeValid = (p) => (['semua', 'bulan', 'minggu'].includes(p) ? p : 'semua');

export class LeaderboardController {
  /** ambilLeaderboard(idSesi): the caller's position and total points. */
  static async ambilLeaderboard(akun, { periode } = {}) {
    const p = periodeValid(periode);
    const posisi = akun ? await Leaderboard.getPosisiPengguna(akun.idRelawan, { periode: p }) : null;
    return { posisi, tglPembaruan: await Leaderboard.getTglPembaruan(), periode: p };
  }

  /** ambilDaftarPeringkat(idSesi): ranked volunteers or communities. */
  static async ambilDaftarPeringkat({ periode, jenis, limit, komunitas } = {}) {
    if (jenis === 'komunitas') return { jenis: 'komunitas', daftar: await Leaderboard.getPeringkatKomunitas({ limit: Number(limit) || 50 }) };
    return {
      jenis: 'relawan',
      daftar: await Leaderboard.getDaftarPeringkat({ periode: periodeValid(periode), limit: Number(limit) || 100, idKomunitas: komunitas || null }),
    };
  }
}
