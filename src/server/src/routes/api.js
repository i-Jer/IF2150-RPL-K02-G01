// Maps HTTP routes to controller operations (View -> Controller -> Model, DPPL 2.4).
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { ah, bad, notFound } from '../utils/errors.js';
import { wajib, opsional, COOKIE } from '../middleware/auth.js';
import { Autentikasi } from '../services/Autentikasi.js';
import { Notifikasi } from '../services/Notifikasi.js';
import { storage } from '../services/StorageAdapter.js';
import { AkunRelawan } from '../models/AkunRelawan.js';
import { Komunitas } from '../models/Komunitas.js';
import { LaporanPencemaran } from '../models/LaporanPencemaran.js';
import { KlaimTitikPencemaran } from '../models/KlaimTitikPencemaran.js';
import { LaporanPembersihan } from '../models/LaporanPembersihan.js';
import { PelaporanController } from '../controllers/PelaporanController.js';
import { HeatmapController } from '../controllers/HeatmapController.js';
import { VerifikasiController } from '../controllers/VerifikasiController.js';
import { KlaimController } from '../controllers/KlaimController.js';
import { PembersihanController } from '../controllers/PembersihanController.js';
import { LeaderboardController } from '../controllers/LeaderboardController.js';
import { AdminController } from '../controllers/AdminController.js';

export const api = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.rules.maxPhotoBytes, files: 2, fields: 30 },
});
const uploadHandler = (mw) => (req, res, next) => mw(req, res, (err) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return next(bad('PHOTO_TOO_LARGE', 'Photo must be 5 MB or smaller.'));
  if (err) return next(bad('UPLOAD_INVALID', err.message));
  next();
});

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Wait a few minutes.' } }) });

const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: config.env === 'production', maxAge: config.sessionDays * 86400 * 1000, path: '/' };
const perangkat = (req) => req.get('x-seaguard-client') || req.get('user-agent') || '';

// ---------- Health ----------
api.get('/health', (_req, res) => res.json({ ok: true, storage: storage.mode, streams: Notifikasi.jumlahKoneksi(), time: new Date().toISOString() }));

// ---------- Authentication (C25) ----------
api.post('/auth/daftar', authLimiter, ah(async (req, res) => {
  const { token, akun } = await Autentikasi.daftar(req.body || {}, perangkat(req));
  res.cookie(COOKIE, token, cookieOpts).status(201).json({ token, akun });
}));
api.post('/auth/login', authLimiter, ah(async (req, res) => {
  const { token, akun } = await Autentikasi.login(req.body?.email, req.body?.password, perangkat(req));
  res.cookie(COOKIE, token, cookieOpts).json({ token, akun });
}));
api.post('/auth/logout', opsional, ah(async (req, res) => {
  await Autentikasi.logout(req.token);
  res.clearCookie(COOKIE, { path: '/' }).json({ ok: true });
}));
api.get('/auth/saya', wajib(), ah(async (req, res) => {
  const akun = await AkunRelawan.getDetailAkun(req.akun.idRelawan);
  res.json({ akun, statistik: await AkunRelawan.getStatistik(req.akun.idRelawan), consent: await Autentikasi.sudahConsent(req.akun.idRelawan) });
}));
api.patch('/auth/saya', wajib(), ah(async (req, res) => {
  const { nama, email, idKomunitas, bahasa } = req.body || {};
  await AkunRelawan.perbaruiDataAkun(req.akun.idRelawan, { nama, email, idKomunitas, bahasa });
  res.json({ akun: await AkunRelawan.getDetailAkun(req.akun.idRelawan) });
}));
api.post('/auth/password', wajib(), authLimiter, ah(async (req, res) => {
  await Autentikasi.gantiPassword(req.akun.idRelawan, req.body?.passwordLama, req.body?.passwordBaru, req.token);
  res.json({ ok: true });
}));
api.post('/auth/consent', wajib(), ah(async (req, res) => {
  await Autentikasi.catatConsent(req.akun.idRelawan, req.body?.jenis || 'lokasi_kamera', req.body?.keputusan, perangkat(req), req.ip);
  res.status(201).json({ ok: true });
}));
api.get('/komunitas', ah(async (_req, res) => res.json(await Komunitas.getDaftarKomunitas())));

// ---------- UC01 Pelaporan (C17) ----------
api.get('/pelaporan/form', wajib('Relawan'), ah(async (req, res) => res.json(await PelaporanController.ambilFormLaporan(req.akun))));
api.post('/pelaporan/validasi', wajib('Relawan'), uploadHandler(upload.single('foto')), ah(async (req, res) => {
  res.json(await PelaporanController.validasiBukti(req.file));
}));
api.post('/pelaporan', wajib('Relawan'), uploadHandler(upload.single('foto')), ah(async (req, res) => {
  res.status(201).json(await PelaporanController.prosesLaporan(req.akun, req.body || {}, req.file));
}));
api.get('/pelaporan/saya', wajib(), ah(async (req, res) => res.json(await LaporanPencemaran.getLaporanSaya(req.akun.idRelawan))));

// ---------- UC02 Heatmap (C18) — public read so the landing page can show the live map ----------
api.get('/heatmap', ah(async (req, res) => res.json(await HeatmapController.ambilDataHeatmap({ kategori: req.query.kategori, area: req.query.area }))));
api.get('/heatmap/filter', ah(async (req, res) => res.json(await HeatmapController.terapkanFilter({ kategori: req.query.kategori, area: req.query.area }))));
api.get('/heatmap/cari', ah(async (req, res) => res.json(await HeatmapController.cariLokasi(req.query.q))));
api.get('/heatmap/saran', ah(async (req, res) => res.json(await HeatmapController.saranLokasi(req.query.q))));
api.get('/heatmap/titik/:id', ah(async (req, res) => res.json(await HeatmapController.ambilDetailTitik(req.params.id))));

// ---------- UC04 Klaim (C20) ----------
api.get('/klaim/saya', wajib(), ah(async (req, res) => {
  res.json({ aktif: await KlaimTitikPencemaran.getKlaimHidup(req.akun.idRelawan), riwayat: await KlaimTitikPencemaran.getRiwayatKlaim(req.akun.idRelawan) });
}));
api.post('/klaim/batal', wajib('Relawan'), ah(async (req, res) => res.json(await KlaimController.batalkan(req.akun))));
api.get('/klaim/:idLaporan', wajib(), ah(async (req, res) => res.json(await KlaimController.ambilDetailTitikKlaim(req.akun, req.params.idLaporan))));
api.post('/klaim/:idLaporan', wajib('Relawan'), ah(async (req, res) => res.status(201).json(await KlaimController.klaimTitik(req.akun, req.params.idLaporan))));

// ---------- UC05 Pembersihan (C21) ----------
api.get('/pembersihan/form', wajib('Relawan'), ah(async (req, res) => res.json(await PembersihanController.ambilFormPembersihan(req.akun))));
api.post('/pembersihan/validasi', wajib('Relawan'), ah(async (req, res) => res.json(await PembersihanController.validasiBukti(req.akun, req.body || {}))));
api.post('/pembersihan', wajib('Relawan'),
  uploadHandler(upload.fields([{ name: 'fotoSebelum', maxCount: 1 }, { name: 'fotoSesudah', maxCount: 1 }])),
  ah(async (req, res) => res.status(201).json(await PembersihanController.prosesLaporanPembersihan(req.akun, req.body || {}, req.files))));
api.get('/pembersihan/saya', wajib(), ah(async (req, res) => res.json(await LaporanPembersihan.getPembersihanSaya(req.akun.idRelawan))));

// ---------- UC03 / UC06 Verifikasi (C19) ----------
api.get('/verifikasi/laporan', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.ambilAntreanLaporan({ status: req.query.status }))));
api.get('/verifikasi/laporan/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.ambilDetailLaporan(req.params.id))));
api.post('/verifikasi/laporan/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.prosesVerifikasiLaporan(req.akun, req.params.id, req.body || {}))));
api.get('/verifikasi/pembersihan', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.ambilDaftarPengajuan({ status: req.query.status }))));
api.get('/verifikasi/pembersihan/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.ambilDetailPengajuan(req.params.id))));
api.post('/verifikasi/pembersihan/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.prosesVerifikasiPembersihan(req.akun, req.params.id, req.body || {}))));
api.get('/verifikasi/log', wajib('Verifikator'), ah(async (req, res) => res.json(await VerifikasiController.ambilLog({ limit: req.query.limit, jenis: req.query.jenis }))));

// ---------- UC07 Leaderboard (C22) ----------
api.get('/leaderboard', opsional, ah(async (req, res) => res.json(await LeaderboardController.ambilLeaderboard(req.akun, { periode: req.query.periode }))));
api.get('/leaderboard/peringkat', ah(async (req, res) => res.json(await LeaderboardController.ambilDaftarPeringkat(req.query))));

// ---------- UC08 Admin (C23) ----------
api.get('/admin', wajib('Verifikator'), ah(async (req, res) => res.json(await AdminController.ambilDataAkunDanKomunitas(req.query))));
api.get('/admin/:tipe/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await AdminController.ambilDetailEntitas(req.params.id, req.params.tipe))));
api.put('/admin/:tipe/:id', wajib('Verifikator'), ah(async (req, res) => res.json(await AdminController.prosesPerubahanData(req.akun, req.params.id, req.params.tipe, req.body || {}))));

// ---------- C24 Notifikasi ----------
api.get('/notifikasi', wajib(), ah(async (req, res) => res.json(await Notifikasi.getDaftar(req.akun.idRelawan))));
api.post('/notifikasi/dibaca', wajib(), ah(async (req, res) => {
  const ids = req.body?.ids === 'semua' ? 'semua' : (Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : []);
  await Notifikasi.tandaiDibaca(req.akun.idRelawan, ids);
  res.json({ ok: true });
}));
api.get('/stream', opsional, (req, res) => Notifikasi.sambung(req, res, req.akun || null));

// ---------- Photos (proxied from object storage) ----------
api.get(/^\/foto\/(.+)$/, ah(async (req, res) => {
  const key = req.params[0];
  if (!/^[a-z]+\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png)$/.test(key)) throw notFound();
  const signed = await storage.urlBaca(key).catch(() => null);
  if (signed) return res.redirect(302, signed);
  const f = await storage.baca(key).catch(() => null);
  if (!f) throw notFound();
  res.set({ 'Content-Type': f.contentType, 'Cache-Control': 'public, max-age=31536000, immutable' });
  if (f.buffer) return res.end(f.buffer);
  f.stream.pipe(res);
}));

// ---------- App update channel (OTA bundle + native APK) ----------
/** release/bundle.json is written by the web build (OTA zip); release/native.json describes the published APK. */
function bacaManifest() {
  const baca = (f) => { try { return JSON.parse(fs.readFileSync(path.join(config.releaseDir, f), 'utf8')); } catch { return null; } };
  const bundle = baca('bundle.json');
  const native = baca('native.json');
  return bundle || native ? { bundle, native } : null;
}
export { bacaManifest };
api.get('/app/versi', (req, res) => {
  const m = bacaManifest();
  if (!m) return res.json({ bundle: null, native: null });
  const base = config.publicUrl || `${req.protocol}://${req.get('host')}`;
  res.set('Cache-Control', 'no-store').json({
    bundle: m.bundle ? { ...m.bundle, url: `${base}/release/${m.bundle.file}` } : null,
    native: m.native ? { ...m.native, url: `${base}/release/${m.native.file}`, halaman: `${base}/download` } : null,
  });
});
