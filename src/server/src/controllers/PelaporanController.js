// C17 PelaporanController: UC01 Melaporkan Titik Pencemaran (KF01-KF05, R02, KNF01).
import { withTransaction } from '../db/pool.js';
import { LaporanPencemaran, INDIKATOR, JENIS_SAMPAH } from '../models/LaporanPencemaran.js';
import { BuktiLaporan } from '../models/BuktiLaporan.js';
import { Autentikasi } from '../services/Autentikasi.js';
import { Notifikasi } from '../services/Notifikasi.js';
import { storage } from '../services/StorageAdapter.js';
import { lokasiTerbalik } from '../services/Geocoder.js';
import { bad } from '../utils/errors.js';
import { insideIndonesiaBox, parseLatLon } from '../utils/geo.js';

const PESAN_FOTO = {
  PHOTO_MISSING: 'Attach a photo of the pollution.',
  PHOTO_FORMAT: 'Photo must be JPG or PNG.',
  PHOTO_TOO_LARGE: 'Photo must be 5 MB or smaller.',
};

export class PelaporanController {
  /** ambilFormLaporan(idSesi): form options and whether consent was already given (KF05). */
  static async ambilFormLaporan(akun) {
    return {
      indikator: INDIKATOR,
      jenisSampah: JENIS_SAMPAH,
      volume: ['kecil', 'sedang', 'besar', 'sangat_besar'],
      batasUkuranMB: 5,
      format: ['JPG', 'PNG'],
      consent: await Autentikasi.sudahConsent(akun.idRelawan),
    };
  }

  /** validasiBukti(idSesi, foto): Algo-001 + EXIF extraction (KF03, KF04). */
  static async validasiBukti(foto) {
    const v = BuktiLaporan.validasiFormatUkuran(foto);
    if (!v.valid) throw bad(v.code, PESAN_FOTO[v.code]);
    const exif = await BuktiLaporan.ekstrakMetadataEXIF(foto);
    return { valid: true, format: v.format, ukuran: foto.size, exif };
  }

  /** R02: reject points outside Indonesian coast and waters. */
  static async validasiWilayah(titik) {
    if (!insideIndonesiaBox(titik)) throw bad('OUTSIDE_INDONESIA', 'This location is outside Indonesian coasts and waters.');
    const r = await lokasiTerbalik(titik);
    if (r.negara && r.negara !== 'id') throw bad('OUTSIDE_INDONESIA', 'This location is outside Indonesian coasts and waters.');
    return r;
  }

  /** prosesLaporan(idSesi, dataLaporan): upload photo, create report + evidence atomically. */
  static async prosesLaporan(akun, body, foto) {
    const bukti = await PelaporanController.validasiBukti(foto);
    let exif = bukti.exif;
    // A client may send EXIF it read before compressing an oversized photo (the compressed copy loses EXIF).
    if (!exif?.lat && body.exifKlien) {
      try {
        const k = JSON.parse(body.exifKlien);
        if (Number.isFinite(k.lat) && Number.isFinite(k.lon)) exif = { ...k, sumber: 'klien' };
      } catch { /* ignore */ }
    }
    if (body.lat === undefined || body.lat === '' || body.lon === undefined || body.lon === '') {
      throw bad('COORD_REQUIRED', 'Add the location: use your GPS or type the coordinates.');
    }
    const titik = parseLatLon(body.lat, body.lon, 'location');
    const wilayah = await PelaporanController.validasiWilayah(titik);
    let jenis = body.jenisSampah;
    if (typeof jenis === 'string') jenis = jenis ? jenis.split(',') : [];
    const laporan = LaporanPencemaran.buatLaporan(akun.idRelawan, titik, body.indikatorTingkat, {
      jenisSampah: jenis,
      perkiraanVolume: body.perkiraanVolume,
      deskripsi: body.deskripsi,
      sumberKoordinat: body.sumberKoordinat,
      lokasiNama: (body.lokasiNama || wilayah.nama || '').trim(),
    });
    const fotoUrl = await storage.unggahFoto({ buffer: foto.buffer, format: bukti.format }, 'laporan');
    const hasil = await withTransaction(async (c) => {
      const simpan = await LaporanPencemaran.simpanLaporan(laporan, c);
      await BuktiLaporan.simpanBukti(simpan.id_laporan, fotoUrl, exif, foto.size, bukti.format, c);
      return simpan;
    });
    Notifikasi.siarkanVerifikator('antrean', { jenis: 'laporan', kode: hasil.kode });
    return { idLaporan: hasil.id_laporan, kode: hasil.kode, statusLaporan: 'Menunggu Verifikasi', exif };
  }
}
