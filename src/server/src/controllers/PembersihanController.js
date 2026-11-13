// C21 PembersihanController: UC05 Melaporkan Hasil Pembersihan (KF13, KF14, KNF06).
import { withTransaction } from '../db/pool.js';
import { KlaimTitikPencemaran } from '../models/KlaimTitikPencemaran.js';
import { LaporanPembersihan } from '../models/LaporanPembersihan.js';
import { BuktiPembersihan } from '../models/BuktiPembersihan.js';
import { BuktiLaporan } from '../models/BuktiLaporan.js';
import { Notifikasi } from '../services/Notifikasi.js';
import { storage } from '../services/StorageAdapter.js';
import { bad, notFound } from '../utils/errors.js';
import { parseLatLon } from '../utils/geo.js';

const PESAN_FOTO = {
  PHOTO_MISSING: 'Attach both the before and after photos.',
  PHOTO_FORMAT: 'Photos must be JPG or PNG.',
  PHOTO_TOO_LARGE: 'Each photo must be 5 MB or smaller.',
};

/** EXIF GPS on the photo is preferred (KF14 "koordinat GPS pada foto"); otherwise the device GPS sent with it. */
async function koordinatFoto(foto, lat, lon, exifKlien, label) {
  const v = BuktiLaporan.validasiFormatUkuran(foto);
  if (!v.valid) throw bad(v.code, PESAN_FOTO[v.code], { foto: label });
  const exif = await BuktiLaporan.ekstrakMetadataEXIF(foto);
  if (exif && Number.isFinite(exif.lat)) return { lat: exif.lat, lon: exif.lon, sumber: 'exif', format: v.format };
  if (exifKlien) {
    try {
      const k = JSON.parse(exifKlien);
      if (Number.isFinite(k.lat) && Number.isFinite(k.lon)) return { ...parseLatLon(k.lat, k.lon), sumber: 'exif', format: v.format };
    } catch { /* ignore */ }
  }
  if (lat === undefined || lat === '' || lon === undefined || lon === '') {
    throw bad('GPS_MISSING', 'The photo has no GPS data. Turn on location and take the photo again.', { foto: label });
  }
  return { ...parseLatLon(lat, lon, `${label} location`), sumber: 'perangkat', format: v.format };
}

export class PembersihanController {
  /** ambilFormPembersihan(idSesi): the active claim that anchors the geofence. */
  static async ambilFormPembersihan(akun) {
    const klaim = await KlaimTitikPencemaran.getKlaimHidup(akun.idRelawan);
    return { klaim, radius: 100, toleransi: 10 };
  }

  /** validasiBukti(idSesi, gpsBefore, gpsAfter): live geofence preview before submitting. */
  static async validasiBukti(akun, { latBefore, lonBefore, latAfter, lonAfter }) {
    const acuan = await KlaimTitikPencemaran.getKoordinatAcuan(akun.idRelawan);
    if (!acuan) throw notFound('NO_ACTIVE_CLAIM', 'Claim a point on the heatmap before reporting a cleanup.');
    const before = parseLatLon(latBefore, lonBefore, 'before location');
    const after = parseLatLon(latAfter, lonAfter, 'after location');
    return BuktiPembersihan.validasiGeofencingRadius(before, after, acuan);
  }

  /** prosesLaporanPembersihan(idSesi, dataBukti) */
  static async prosesLaporanPembersihan(akun, body, files) {
    const acuan = await KlaimTitikPencemaran.getKoordinatAcuan(akun.idRelawan);
    if (!acuan) throw notFound('NO_ACTIVE_CLAIM', 'Claim a point on the heatmap before reporting a cleanup.');
    const fb = files?.fotoSebelum?.[0];
    const fa = files?.fotoSesudah?.[0];
    if (!fb || !fa) throw bad('PHOTO_MISSING', PESAN_FOTO.PHOTO_MISSING);
    const before = await koordinatFoto(fb, body.latBefore, body.lonBefore, body.exifBefore, 'before');
    const after = await koordinatFoto(fa, body.latAfter, body.lonAfter, body.exifAfter, 'after');
    const geo = await BuktiPembersihan.validasiGeofencingRadius(before, after, acuan);
    if (!geo.valid) {
      throw bad('GEOFENCE_OUTSIDE', 'Photo location is more than 100 meters from the claimed point.', {
        jarakBefore: geo.jarakBefore, jarakAfter: geo.jarakAfter, sumberBefore: before.sumber, sumberAfter: after.sumber,
      });
    }
    const draft = LaporanPembersihan.buatLaporanPembersihan(akun.idRelawan, body.deskripsiKegiatan, null, null, {
      jumlahPeserta: body.jumlahPeserta, perkiraanBeratKg: body.perkiraanBeratKg,
    });
    const [urlB, urlA] = await Promise.all([
      storage.unggahFoto({ buffer: fb.buffer, format: before.format }, 'pembersihan'),
      storage.unggahFoto({ buffer: fa.buffer, format: after.format }, 'pembersihan'),
    ]);
    const hasil = await withTransaction(async (c) => {
      // Lock the claim row so a double submit cannot create two pending cleanups.
      const { rows } = await c.query(
        `SELECT status_klaim FROM klaim_titik_pencemaran WHERE id_klaim = $1 FOR UPDATE`, [acuan.idKlaim]);
      if (rows[0]?.status_klaim !== 'Aktif') throw bad('CLAIM_NOT_ACTIVE', 'This claim is already waiting for verification.');
      const simpan = await LaporanPembersihan.simpanLaporanPembersihan(
        { ...draft, idKlaim: acuan.idKlaim, fotoBeforeUrl: urlB, fotoAfterUrl: urlA },
        { before, after, jarakBefore: geo.jarakBefore, jarakAfter: geo.jarakAfter }, c);
      await KlaimTitikPencemaran.ubahStatusKlaim(acuan.idKlaim, 'Menunggu Verifikasi', c);
      return simpan;
    });
    Notifikasi.siarkanVerifikator('antrean', { jenis: 'pembersihan', kode: hasil.kode });
    return { idPembersihan: hasil.id_pembersihan, kode: hasil.kode, statusKlaim: 'Menunggu Verifikasi', geofence: geo };
  }
}
