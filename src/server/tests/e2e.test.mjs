// End-to-end API test of the whole flow (UC01 -> UC08) against a running server.
// BASE_URL defaults to http://localhost:8080. Uses the seeded demo accounts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gambarDemo } from '../src/db/demoImage.js';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const PW = process.env.SEED_DEMO_PASSWORD || 'Relawan123!';
const PWV = process.env.SEED_VERIFIER_PASSWORD || 'Verifikator123!';
const uniq = Date.now() % 100000;

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}
const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).json.token;
const foto = (seed, litter = 50) => new Blob([gambarDemo({ seed, litter, width: 320, height: 240 })], { type: 'image/png' });

let relawan; let relawanB; let tester; let verif; let idLaporan; let kode;
// A point on Ancol beach, offset per run so repeated runs create new clusters.
const titik = { lat: -6.1215 + (uniq % 50) * 0.0004, lon: 106.8450 + (uniq % 7) * 0.0003 };

test('sign up a new volunteer, then log in with demo accounts', async () => {
  const r = await call('POST', '/auth/daftar', { body: { nama: `Tester ${uniq}`, email: `tester${uniq}@seaguard.test`, password: 'Tester1234', bahasa: 'id' } });
  assert.equal(r.status, 201);
  relawanB = r.json.token;
  tester = r.json.token; // the new account itself; relawan/relawanB may swap in the claim race below
  const dup = await call('POST', '/auth/daftar', { body: { nama: 'Dup', email: `tester${uniq}@seaguard.test`, password: 'Tester1234' } });
  assert.equal(dup.json.error.code, 'EMAIL_TAKEN');
  relawan = await login('relawan1@seaguard.test', PW);
  verif = await login('verifikator@seaguard.test', PWV);
  assert.ok(relawan && verif);
  const me = await call('GET', '/auth/saya', { token: relawan });
  assert.equal(me.json.akun.peran, 'Relawan');
});

test('KNF09: five failed logins lock the account', async () => {
  const email = `lock${uniq}@seaguard.test`;
  await call('POST', '/auth/daftar', { body: { nama: 'Lock Test', email, password: 'Locktest123' } });
  let last;
  for (let i = 0; i < 5; i += 1) last = await call('POST', '/auth/login', { body: { email, password: 'wrong-password' } });
  assert.equal(last.status, 423);
  const ok = await call('POST', '/auth/login', { body: { email, password: 'Locktest123' } });
  assert.equal(ok.json.error.code, 'ACCOUNT_LOCKED');
});

test('RBAC: volunteer cannot open the verification queue', async () => {
  assert.equal((await call('GET', '/verifikasi/laporan', { token: relawan })).status, 403);
  assert.equal((await call('GET', '/verifikasi/laporan')).status, 401);
});

test('UC01 alternative: invalid photo and outside-Indonesia location are rejected', async () => {
  const f1 = new FormData();
  f1.append('foto', new Blob([Buffer.from('GIF89a not an image')], { type: 'image/png' }), 'x.png');
  f1.append('indikatorTingkat', 'Waspada'); f1.append('lat', titik.lat); f1.append('lon', titik.lon);
  assert.equal((await call('POST', '/pelaporan', { token: relawan, form: f1 })).json.error.code, 'PHOTO_FORMAT');
  const f2 = new FormData();
  f2.append('foto', foto(9), 'x.png'); f2.append('indikatorTingkat', 'Waspada'); f2.append('lat', '48.85'); f2.append('lon', '2.35');
  assert.equal((await call('POST', '/pelaporan', { token: relawan, form: f2 })).json.error.code, 'OUTSIDE_INDONESIA');
});

test('UC01: report a pollution point', async () => {
  const consent = await call('POST', '/auth/consent', { token: relawan, body: { jenis: 'lokasi_kamera', keputusan: 'Izinkan' } });
  assert.equal(consent.status, 201);
  const f = new FormData();
  f.append('foto', foto(3, 80), 'bukti.png');
  f.append('indikatorTingkat', 'Berbahaya');
  f.append('lat', titik.lat); f.append('lon', titik.lon);
  f.append('jenisSampah', 'plastik,styrofoam'); f.append('perkiraanVolume', 'besar');
  f.append('deskripsi', 'E2E test report'); f.append('sumberKoordinat', 'perangkat');
  const r = await call('POST', '/pelaporan', { token: relawan, form: f });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  ({ idLaporan, kode } = r.json);
  assert.match(kode, /^LP-\d{4}$/);
});

test('UC03: verifier approves; audit log and notification are written', async () => {
  const q = await call('GET', '/verifikasi/laporan', { token: verif });
  assert.ok(q.json.some((l) => l.idLaporan === idLaporan));
  const det = await call('GET', `/verifikasi/laporan/${idLaporan}`, { token: verif });
  assert.equal(det.json.detailLaporan.kode, kode);
  const rejectNoReason = await call('POST', `/verifikasi/laporan/${idLaporan}`, { token: verif, body: { keputusan: 'Ditolak' } });
  assert.equal(rejectNoReason.json.error.code, 'REASON_REQUIRED');
  const ok = await call('POST', `/verifikasi/laporan/${idLaporan}`, { token: verif, body: { keputusan: 'Disetujui' } });
  assert.equal(ok.json.status, 'Disetujui');
  const twice = await call('POST', `/verifikasi/laporan/${idLaporan}`, { token: verif, body: { keputusan: 'Disetujui' } });
  assert.equal(twice.json.error.code, 'ALREADY_DECIDED');
  const log = await call('GET', '/verifikasi/log?limit=5', { token: verif });
  assert.ok(log.json.some((g) => g.kodeObjek === kode));
  const notif = await call('GET', '/notifikasi', { token: relawan });
  assert.ok(notif.json.daftar.some((n) => n.data?.kode === kode && n.jenis === 'laporan_disetujui'));
});

test('UC02: the approved point is on the heatmap, filters and search work', async () => {
  const h = await call('GET', '/heatmap');
  assert.ok(h.json.titik.some((t) => t.idLaporan === idLaporan));
  const f = await call('GET', '/heatmap/filter?kategori=Sehat');
  assert.ok(f.json.titik.every((t) => t.kategoriKualitas === 'Sehat'));
  const empty = await call('GET', '/heatmap/filter?kategori=');
  assert.equal(empty.json.kosong, true);
  const nf = await call('GET', '/heatmap/cari?q=zzqqxx%20nowhere');
  assert.equal(nf.json.error.code, 'LOCATION_NOT_FOUND');
});

test('UC04 + KNF05: two volunteers claim at once, exactly one wins', async () => {
  const [a, b] = await Promise.all([
    call('POST', `/klaim/${idLaporan}`, { token: relawan }),
    call('POST', `/klaim/${idLaporan}`, { token: relawanB }),
  ]);
  const wins = [a, b].filter((r) => r.status === 201);
  const loses = [a, b].filter((r) => r.status === 409);
  assert.equal(wins.length, 1, JSON.stringify([a.json, b.json]));
  assert.equal(loses.length, 1);
  assert.equal(loses[0].json.error.code, 'ALREADY_CLAIMED');
  if (b.status === 201) { const t = relawan; relawan = relawanB; relawanB = t; } // keep `relawan` as the claim holder
});

test('UC05: photos outside 100 m are rejected, inside are accepted', async () => {
  const far = new FormData();
  far.append('fotoSebelum', foto(4, 70), 'a.png'); far.append('fotoSesudah', foto(4, 3), 'b.png');
  far.append('latBefore', titik.lat + 0.003); far.append('lonBefore', titik.lon);
  far.append('latAfter', titik.lat); far.append('lonAfter', titik.lon);
  far.append('deskripsiKegiatan', 'Collected bottles along the shore line.');
  const r1 = await call('POST', '/pembersihan', { token: relawan, form: far });
  assert.equal(r1.json.error.code, 'GEOFENCE_OUTSIDE');
  const pre = await call('POST', '/pembersihan/validasi', { token: relawan, body: { latBefore: titik.lat + 0.0005, lonBefore: titik.lon, latAfter: titik.lat, lonAfter: titik.lon + 0.0004 } });
  assert.equal(pre.json.valid, true); // ~55 m and ~44 m
  const near = new FormData();
  near.append('fotoSebelum', foto(4, 70), 'a.png'); near.append('fotoSesudah', foto(4, 3), 'b.png');
  near.append('latBefore', titik.lat + 0.0005); near.append('lonBefore', titik.lon);
  near.append('latAfter', titik.lat); near.append('lonAfter', titik.lon + 0.0004);
  near.append('deskripsiKegiatan', 'Collected bottles along the shore line.'); near.append('jumlahPeserta', '4'); near.append('perkiraanBeratKg', '12.5');
  const r2 = await call('POST', '/pembersihan', { token: relawan, form: near });
  assert.equal(r2.status, 201, JSON.stringify(r2.json));
  globalThis.idPembersihan = r2.json.idPembersihan;
});

test('UC06 + UC07: approval adds heat-based points and reranks the leaderboard', async () => {
  const before = (await call('GET', '/auth/saya', { token: relawan })).json.akun.totalPoin;
  const det = await call('GET', `/verifikasi/pembersihan/${globalThis.idPembersihan}`, { token: verif });
  assert.ok(det.json.fotoBeforeAfter.before.url && det.json.fotoBeforeAfter.after.url);
  const r = await call('POST', `/verifikasi/pembersihan/${globalThis.idPembersihan}`, { token: verif, body: { keputusan: 'Disetujui' } });
  assert.equal(r.json.status, 'Disetujui');
  assert.ok(r.json.poin >= 1);
  const after = (await call('GET', '/auth/saya', { token: relawan })).json.akun.totalPoin;
  assert.equal(after, before + r.json.poin);
  const lb = await call('GET', '/leaderboard', { token: relawan });
  assert.ok(lb.json.posisi.peringkat >= 1);
  const h = await call('GET', '/heatmap');
  assert.ok(!h.json.titik.some((t) => t.idLaporan === idLaporan), 'cleaned point leaves the heatmap');
});

test('UC08: admin panel updates communities and guards roles (R24)', async () => {
  const data = await call('GET', '/admin', { token: verif });
  assert.ok(data.json.daftarAkun.length > 0 && data.json.daftarKomunitas.length > 0);
  const target = data.json.daftarAkun.find((a) => a.email === `tester${uniq}@seaguard.test`);
  const noInst = await call('PUT', `/admin/akun/${target.idRelawan}`, { token: verif, body: { peran: 'Verifikator' } });
  assert.equal(noInst.json.error.code, 'INSTITUTION_REQUIRED');
  const sus = await call('PUT', `/admin/akun/${target.idRelawan}`, { token: verif, body: { statusAkun: 'Ditangguhkan' } });
  assert.equal(sus.json.akun.statusAkun, 'Ditangguhkan');
  assert.equal((await call('GET', '/auth/saya', { token: tester })).status, 401, 'a suspended account is signed out');
  const kom = await call('PUT', '/admin/komunitas/baru', { token: verif, body: { namaKomunitas: `E2E Community ${uniq}`, wilayah: 'Test' } });
  assert.equal(kom.json.komunitas.namaKomunitas, `E2E Community ${uniq}`);
});
