// C02 BuktiLaporan: photo evidence for a pollution report, with EXIF metadata.
import exifr from 'exifr';
import { db } from '../db/pool.js';
import { config } from '../config.js';
import { pointSql } from '../utils/geo.js';

const FORMAT_DIIZINKAN = ['image/jpeg', 'image/png'];

/** Detect the real type from magic bytes so a renamed file cannot pass as an image. */
export function sniffImageType(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a) return 'image/png';
  return null;
}

export class BuktiLaporan {
  /** Algo-001 validasiFormatUkuran(foto): JPG/PNG only, at most 5 MB (+ magic-byte check). */
  static validasiFormatUkuran(foto) {
    if (!foto || !foto.buffer) return { valid: false, code: 'PHOTO_MISSING' };
    if (!FORMAT_DIIZINKAN.includes(foto.mimetype)) return { valid: false, code: 'PHOTO_FORMAT' };
    if (foto.size > config.rules.maxPhotoBytes) return { valid: false, code: 'PHOTO_TOO_LARGE' };
    const real = sniffImageType(foto.buffer);
    if (!real || !FORMAT_DIIZINKAN.includes(real)) return { valid: false, code: 'PHOTO_FORMAT' };
    return { valid: true, format: real === 'image/png' ? 'png' : 'jpg' };
  }

  /** ekstrakMetadataEXIF(foto): GPS, capture time and camera model when present. */
  static async ekstrakMetadataEXIF(foto) {
    try {
      const data = await exifr.parse(foto.buffer, { gps: true, tiff: true, exif: true, pick: ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model', 'GPSAltitude'] });
      if (!data) return null;
      const meta = {};
      if (Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
        meta.lat = Math.round(data.latitude * 1e6) / 1e6;
        meta.lon = Math.round(data.longitude * 1e6) / 1e6;
      }
      if (data.DateTimeOriginal) meta.waktuAmbil = new Date(data.DateTimeOriginal).toISOString();
      if (data.Make || data.Model) meta.kamera = [data.Make, data.Model].filter(Boolean).join(' ').trim();
      return Object.keys(meta).length ? meta : null;
    } catch {
      return null;
    }
  }

  static async simpanBukti(idLaporan, fotoUrl, metadataEXIF, ukuranFile, formatFile, client) {
    const hasGps = metadataEXIF && Number.isFinite(metadataEXIF.lat);
    await db(client).query(
      `INSERT INTO bukti_laporan (id_laporan, foto_url, ukuran_file, format_file, metadata_exif, gps_exif)
       VALUES ($1, $2, $3, $4, $5, ${hasGps ? pointSql('$6', '$7') : 'NULL'})`,
      hasGps
        ? [idLaporan, fotoUrl, ukuranFile, formatFile, metadataEXIF, metadataEXIF.lon, metadataEXIF.lat]
        : [idLaporan, fotoUrl, ukuranFile, formatFile, metadataEXIF],
    );
    return true;
  }

  static async getDetailBukti(idLaporan, client) {
    const { rows } = await db(client).query(
      `SELECT b.id_bukti, b.foto_url, b.ukuran_file, b.format_file, b.metadata_exif,
         CASE WHEN b.gps_exif IS NULL THEN NULL ELSE round(ST_Distance(b.gps_exif, l.koordinat_gps)::numeric, 1) END AS jarak_exif_m
       FROM bukti_laporan b JOIN laporan_pencemaran l ON l.id_laporan = b.id_laporan WHERE b.id_laporan = $1`, [idLaporan]);
    return rows.map((r) => ({
      idBukti: r.id_bukti,
      fotoUrl: `/api/foto/${r.foto_url}`,
      ukuranFile: r.ukuran_file,
      formatFile: r.format_file,
      metadataEXIF: r.metadata_exif,
      jarakExifM: r.jarak_exif_m,
    }));
  }
}
