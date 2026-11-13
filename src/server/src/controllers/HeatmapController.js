import { saranLokasi } from '../services/Geocoder.js';
// C18 HeatmapController: UC02 Melihat Data dan Heatmap Pencemaran (KF06-KF08).
import { PetaHeatmap, KATEGORI } from '../models/PetaHeatmap.js';
import { LaporanPencemaran } from '../models/LaporanPencemaran.js';
import { BuktiLaporan } from '../models/BuktiLaporan.js';
import { notFound } from '../utils/errors.js';

const parseKategori = (k) => {
  if (k === undefined || k === null) return KATEGORI; // no filter given
  if (k === '') return []; // every category deselected
  const arr = (Array.isArray(k) ? k : String(k).split(',')).map((s) => s.trim()).filter((s) => KATEGORI.includes(s));
  return arr;
};

export class HeatmapController {
  /** ambilDataHeatmap(idSesi): clusters, points, pending markers (R09) and the summary panel. */
  static async ambilDataHeatmap({ kategori, area } = {}) {
    const t0 = Date.now();
    const kat = parseKategori(kategori);
    const [layer, menunggu, ringkasan, papan] = await Promise.all([
      PetaHeatmap.tampilkanHeatmap({ kategori: kat, areaPeta: area }),
      LaporanPencemaran.getLaporanMenunggu(),
      LaporanPencemaran.getRingkasan(),
      PetaHeatmap.getPapanHotspot({ kategori: kat }),
    ]);
    return { ...layer, menunggu, ringkasan, papan, kategori: kat, waktuMs: Date.now() - t0 };
  }

  /** terapkanFilter(idSesi, kategori, areaPeta): "Tidak ada data untuk tingkat pencemaran ini" when empty. */
  static async terapkanFilter({ kategori, area }) {
    const kat = parseKategori(kategori);
    const layer = await PetaHeatmap.filterBerdasarkanKategori(kat, area);
    const kosong = !kat.length || layer.klaster.length === 0;
    return {
      ...layer,
      papan: await PetaHeatmap.getPapanHotspot({ kategori: kat }),
      kosong,
      pesan: kosong ? { code: 'FILTER_EMPTY', message: 'No data for this pollution level.' } : null,
    };
  }

  /** cariLokasi(idSesi, kataKunci): "Lokasi tidak ditemukan" when nothing matches. */
  static async cariLokasi(kataKunci) {
    const hasil = await PetaHeatmap.cariLokasi(kataKunci);
    if (!hasil) throw notFound('LOCATION_NOT_FOUND', 'Location not found.');
    return hasil;
  }

  /** Place suggestions while typing in the map search (abbreviations expanded, real places first). */
  static async saranLokasi(kataKunci) {
    return saranLokasi(kataKunci);
  }

  /** ambilDetailTitik(idSesi, idLaporan): report detail, coordinates and its cluster. */
  static async ambilDetailTitik(idLaporan) {
    const detail = await LaporanPencemaran.getDetailPencemaran(idLaporan);
    if (!['Disetujui', 'Diklaim', 'Dibersihkan'].includes(detail.statusLaporan)) throw notFound('REPORT_NOT_FOUND', 'Report not found.');
    const [klaster, bukti] = await Promise.all([
      PetaHeatmap.getDetailKlaster({ lat: detail.lat, lon: detail.lon }),
      BuktiLaporan.getDetailBukti(detail.idLaporan),
    ]);
    return { detail, klaster, bukti };
  }
}
