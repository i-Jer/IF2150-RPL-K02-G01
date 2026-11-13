// GPS + photo helpers (KF02 Geolocation, KF03 validation, KF04 EXIF) for both web and app.
import exifr from 'exifr';
import { Geolocation } from '@capacitor/geolocation';
import { isNative } from './platform.js';

const MAX = 5 * 1024 * 1024;

/**
 * Current position for "Use my location". Tries precise GPS first, then falls back to the faster
 * network/Wi-Fi fix (laptops have no GPS chip, and indoors a first GPS fix often times out).
 * Errors carry a specific code: GEO_DENIED (permission blocked), GEO_OFF (location services off),
 * GEO_TIMEOUT, GEO_INSECURE (page not on https), GEO_UNAVAILABLE.
 */
export async function ambilKoordinatGPS() {
  const hasil = (p) => ({ lat: round6(p.coords.latitude), lon: round6(p.coords.longitude), akurasi: p.coords.accuracy });
  if (isNative) {
    let perm = await Geolocation.checkPermissions().catch(() => null);
    if (!perm || (perm.location !== 'granted' && perm.coarseLocation !== 'granted')) perm = await Geolocation.requestPermissions().catch(() => null);
    if (!perm || (perm.location !== 'granted' && perm.coarseLocation !== 'granted')) throw kodeGeo('GEO_DENIED');
    try {
      return hasil(await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }));
    } catch (e1) {
      try { return hasil(await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 })); }
      catch (e2) { throw kodeGeo(/disabled|not enabled|location services/i.test(`${e2?.message} ${e1?.message}`) ? 'GEO_OFF' : /timeout/i.test(e2?.message || '') ? 'GEO_TIMEOUT' : 'GEO_UNAVAILABLE'); }
    }
  }
  if (!window.isSecureContext) throw kodeGeo('GEO_INSECURE');
  if (!('geolocation' in navigator)) throw kodeGeo('GEO_UNAVAILABLE');
  const sekali = (opts) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));
  try {
    return hasil(await sekali({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }));
  } catch (e1) {
    if (e1.code === 1) throw kodeGeo('GEO_DENIED');
    try {
      return hasil(await sekali({ enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }));
    } catch (e2) {
      throw kodeGeo(e2.code === 1 ? 'GEO_DENIED' : e2.code === 3 ? 'GEO_TIMEOUT' : 'GEO_OFF');
    }
  }
}

const kodeGeo = (code) => Object.assign(new Error(code), { code });

const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** Read EXIF GPS/time from a File in the browser (before any compression drops it). */
export async function bacaExif(file) {
  try {
    const d = await exifr.parse(file, { gps: true, pick: ['latitude', 'longitude', 'DateTimeOriginal', 'Make', 'Model'] });
    if (!d) return null;
    const out = {};
    if (Number.isFinite(d.latitude) && Number.isFinite(d.longitude)) { out.lat = round6(d.latitude); out.lon = round6(d.longitude); }
    if (d.DateTimeOriginal) out.waktuAmbil = new Date(d.DateTimeOriginal).toISOString();
    if (d.Make || d.Model) out.kamera = [d.Make, d.Model].filter(Boolean).join(' ');
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Client-side Algo-001 mirror: type check by magic bytes plus size. */
export async function cekFoto(file) {
  if (!file) return { ok: false, code: 'PHOTO_MISSING' };
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const jpg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (!jpg && !png) return { ok: false, code: 'PHOTO_FORMAT' };
  return { ok: true, besar: file.size > MAX };
}

/** Downscale an oversized JPEG/PNG to a JPEG under 5 MB. */
export async function kompres(file) {
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
  for (let q = 0.85; q >= 0.5; q -= 0.1) {
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
    if (blob && blob.size <= MAX) return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    scale *= 0.8;
  }
  throw Object.assign(new Error('too large'), { code: 'PHOTO_TOO_LARGE' });
}

/**
 * Prepare a picked photo: validate, read EXIF, compress when > 5 MB.
 * Returns {file, preview, exif, dikompres} or throws {code}.
 */
export async function siapkanFoto(file) {
  const cek = await cekFoto(file);
  if (!cek.ok) throw Object.assign(new Error(cek.code), { code: cek.code });
  const exif = await bacaExif(file);
  let out = file;
  let dikompres = false;
  if (cek.besar) { out = await kompres(file); dikompres = true; }
  return { file: out, preview: URL.createObjectURL(out), exif, dikompres };
}
