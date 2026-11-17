// Background upkeep that runs only when someone uses the app, so an idle server makes no database
// calls and the hosting platform can put both services to sleep.
//  - claim expiry (R: 7-day window) is checked at most every 10 minutes, on the next API request
//  - heat intensity ("days unhandled" grows over time) is refreshed before a heatmap read if older than an hour
import { KlaimTitikPencemaran } from '../models/KlaimTitikPencemaran.js';
import { PetaHeatmap } from '../models/PetaHeatmap.js';
import { Notifikasi } from './Notifikasi.js';
import { CacheRespons } from '../utils/cacheRespons.js';

const JEDA_KLAIM = 10 * 60 * 1000;
const UMUR_HEAT = 60 * 60 * 1000;

let cekKlaimTerakhir = 0;
let jalanKlaim = null;
let heatTerakhir = 0;
let jalanHeat = null;

export class Pemeliharaan {
  /** Recompute clusters now (single flight) and drop cached map responses. */
  static async hitungUlangHeat() {
    if (!jalanHeat) {
      jalanHeat = PetaHeatmap.hitungHeatIntensity()
        .then((r) => { heatTerakhir = Date.now(); CacheRespons.batalkan(); return r; })
        .finally(() => { jalanHeat = null; });
    }
    return jalanHeat;
  }

  /** Called before serving the map: refresh heat only if it is stale. */
  static async pastikanHeatSegar() {
    if (Date.now() - heatTerakhir < UMUR_HEAT) return;
    try { await Pemeliharaan.hitungUlangHeat(); } catch (e) { console.error('[upkeep] heat', e.message); }
  }

  /** Expire overdue claims (at most every 10 minutes). */
  static async cekKlaimKedaluwarsa() {
    if (jalanKlaim || Date.now() - cekKlaimTerakhir < JEDA_KLAIM) return jalanKlaim;
    cekKlaimTerakhir = Date.now();
    jalanKlaim = (async () => {
      try {
        const expired = await KlaimTitikPencemaran.kedaluwarsakan();
        for (const k of expired) {
          const n = await Notifikasi.kirimNotifikasi(k.id_relawan, {
            jenis: 'klaim_kedaluwarsa', judul: `Claim ${k.kode} expired`, pesan: 'The 7-day window ended and the point is open again.', data: { kode: k.kode },
          });
          Notifikasi.dorong(k.id_relawan, n);
        }
        if (expired.length) {
          await Pemeliharaan.hitungUlangHeat();
          Notifikasi.siarkan('heatmap', { alasan: 'klaim_kedaluwarsa' });
        }
      } catch (e) { console.error('[upkeep] claim expiry', e.message); } finally { jalanKlaim = null; }
    })();
    return jalanKlaim;
  }

  /** Express middleware: kick off the claim check without delaying the request. */
  static middleware(_req, _res, next) {
    Pemeliharaan.cekKlaimKedaluwarsa();
    next();
  }
}
