// Demo data (fictional people, communities and reports at real Indonesian coastlines).
// Runs only when the database has no accounts. Demo photos are generated, clearly synthetic images.
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './pool.js';
import { hashPassword } from '../services/Autentikasi.js';
import { storage } from '../services/StorageAdapter.js';
import { gambarDemo } from './demoImage.js';
import { pointSql } from '../utils/geo.js';

const KOMUNITAS = [
  ['Pantai Bersih Jakarta', 'Weekend cleanups along Jakarta Bay and Muara Angke.', 'DKI Jakarta', true],
  ['Bali Reef Guardians', 'Divers and surfers keeping Kuta to Sanur clear.', 'Bali', true],
  ['Pesisir Hijau Semarang', 'Mangrove and coastline volunteers in Tambak Lorok.', 'Jawa Tengah', true],
  ['Makassar Bahari', 'Students and fishers around Losari.', 'Sulawesi Selatan', false],
  ['ITB Ocean Club', 'Campus club organising coastal trips.', 'Jawa Barat', true],
];

// [name, email-local, community index or null, points]
const RELAWAN = [
  ['Ayu Lestari', 'ayu', 0, 412], ['Bima Prasetyo', 'bima', 1, 388], ['Citra Maharani', 'citra', 2, 296],
  ['Dimas Saputra', 'dimas', 0, 255], ['Eka Wulandari', 'eka', 3, 214], ['Fajar Nugroho', 'fajar', 4, 187],
  ['Gita Anggraini', 'gita', 1, 160], ['Hendra Wijaya', 'hendra', 2, 132], ['Intan Permata', 'intan', 4, 98],
  ['Joko Santoso', 'joko', null, 61], ['Kartika Sari', 'kartika', 3, 37], ['Lukman Hakim', 'lukman', null, 0],
];

// Reports: [lat, lon, indikator, status, daysAgo, place, jenis]
const LAPORAN = [
  [-6.1061, 106.7742, 'Berbahaya', 'Disetujui', 12, 'Muara Angke, Jakarta Utara', ['plastik', 'styrofoam']],
  [-6.1049, 106.7761, 'Berbahaya', 'Disetujui', 10, 'Muara Angke, Jakarta Utara', ['plastik']],
  [-6.1072, 106.7725, 'Waspada', 'Disetujui', 9, 'Muara Angke, Jakarta Utara', ['jaring', 'plastik']],
  [-6.1080, 106.7750, 'Berbahaya', 'Disetujui', 7, 'Pluit, Jakarta Utara', ['plastik']],
  [-6.0985, 106.9604, 'Waspada', 'Disetujui', 6, 'Marunda, Jakarta Utara', ['plastik', 'logam']],
  [-6.1218, 106.8443, 'Sehat', 'Disetujui', 3, 'Pantai Ancol, Jakarta Utara', ['plastik']],
  [-8.7184, 115.1686, 'Berbahaya', 'Diklaim', 8, 'Pantai Kuta, Badung', ['plastik', 'kayu']],
  [-8.7199, 115.1680, 'Berbahaya', 'Disetujui', 6, 'Pantai Kuta, Badung', ['plastik']],
  [-8.7605, 115.1674, 'Waspada', 'Disetujui', 4, 'Kedonganan, Badung', ['jaring']],
  [-8.6783, 115.2635, 'Sehat', 'Disetujui', 2, 'Pantai Sanur, Denpasar', ['plastik']],
  [-6.9496, 110.4431, 'Berbahaya', 'Disetujui', 15, 'Tambak Lorok, Semarang', ['plastik', 'organik']],
  [-6.9488, 110.4442, 'Waspada', 'Disetujui', 11, 'Tambak Lorok, Semarang', ['plastik']],
  [-6.9479, 110.3893, 'Waspada', 'Disetujui', 5, 'Pantai Marina, Semarang', ['styrofoam']],
  [-7.2368, 112.7981, 'Berbahaya', 'Disetujui', 9, 'Pantai Kenjeran, Surabaya', ['plastik', 'kaca']],
  [-7.2359, 112.7990, 'Waspada', 'Disetujui', 3, 'Pantai Kenjeran, Surabaya', ['plastik']],
  [-5.1438, 119.4073, 'Waspada', 'Disetujui', 9, 'Pantai Losari, Makassar', ['plastik']],
  [-5.1447, 119.4066, 'Berbahaya', 'Disetujui', 4, 'Pantai Losari, Makassar', ['plastik', 'limbah_b3']],
  [3.7804, 98.6935, 'Waspada', 'Disetujui', 20, 'Belawan, Medan', ['plastik', 'logam']],
  [-0.9471, 100.3543, 'Sehat', 'Disetujui', 1, 'Pantai Padang', ['plastik']],
  [-7.6964, 108.6534, 'Sehat', 'Disetujui', 2, 'Pangandaran', ['plastik']],
  [-8.0256, 110.3286, 'Waspada', 'Disetujui', 6, 'Parangtritis, Bantul', ['plastik', 'kayu']],
  [-6.9886, 106.5527, 'Berbahaya', 'Disetujui', 13, 'Pelabuhan Ratu, Sukabumi', ['jaring', 'plastik']],
  [-6.0717, 105.8833, 'Waspada', 'Disetujui', 7, 'Anyer, Serang', ['plastik']],
  [1.4931, 124.8413, 'Waspada', 'Disetujui', 8, 'Pantai Manado', ['plastik']],
  [-3.6954, 128.1814, 'Berbahaya', 'Disetujui', 17, 'Teluk Ambon', ['plastik', 'styrofoam']],
  [-10.1617, 123.5775, 'Waspada', 'Disetujui', 10, 'Kupang', ['plastik']],
  [-8.4964, 119.8877, 'Sehat', 'Disetujui', 5, 'Labuan Bajo', ['plastik']],
  [-6.7063, 108.5571, 'Berbahaya', 'Disetujui', 14, 'Cirebon', ['plastik', 'organik']],
  [-6.8694, 109.1402, 'Waspada', 'Disetujui', 9, 'Tegal', ['plastik']],
  [1.0456, 104.0305, 'Waspada', 'Disetujui', 6, 'Batam', ['plastik', 'logam']],
  [-1.2675, 116.8289, 'Sehat', 'Disetujui', 3, 'Balikpapan', ['plastik']],
  [-5.4972, 105.2647, 'Berbahaya', 'Disetujui', 12, 'Teluk Lampung', ['plastik']],
  [-6.1180, 106.8890, 'Berbahaya', 'Menunggu Verifikasi', 0.3, 'Tanjung Priok, Jakarta Utara', ['plastik']],
  [-8.7170, 115.1695, 'Waspada', 'Menunggu Verifikasi', 0.6, 'Pantai Kuta, Badung', ['plastik']],
  [-6.9500, 110.4420, 'Berbahaya', 'Menunggu Verifikasi', 0.8, 'Tambak Lorok, Semarang', ['styrofoam']],
  [-5.1430, 119.4080, 'Waspada', 'Menunggu Verifikasi', 1.1, 'Pantai Losari, Makassar', ['plastik']],
  [-7.2375, 112.7975, 'Sehat', 'Menunggu Verifikasi', 0.2, 'Pantai Kenjeran, Surabaya', ['plastik']],
  [-6.5562, 110.6484, 'Waspada', 'Dibersihkan', 25, 'Pantai Bandengan, Jepara', ['plastik']],
  [-6.8886, 109.6753, 'Berbahaya', 'Dibersihkan', 30, 'Pekalongan', ['plastik']],
  [-8.4964, 116.0437, 'Waspada', 'Ditolak', 4, 'Senggigi, Lombok', ['plastik']],
];

const DESKRIPSI = {
  Berbahaya: 'Thick line of plastic and foam along the tide line, bags caught in the rocks.',
  Waspada: 'Scattered bottles and wrappers along roughly 50 meters of shore.',
  Sehat: 'A few pieces of plastic, mostly clean sand.',
};

export async function seedJikaKosong({ force = false } = {}) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM akun_relawan');
  if (rows[0].n > 0 && !force) return false;
  console.log('[seed] empty database, inserting demo data');

  // Photos: a handful of synthetic scenes reused across reports.
  const fotoKotor = [];
  for (let i = 0; i < 6; i += 1) {
    fotoKotor.push(await storage.unggahFoto({ buffer: gambarDemo({ seed: i + 1, litter: 40 + i * 12 }), format: 'png' }, 'laporan'));
  }
  const fotoBersih = await storage.unggahFoto({ buffer: gambarDemo({ seed: 2, litter: 2 }), format: 'png' }, 'pembersihan');
  const fotoSebelum = await storage.unggahFoto({ buffer: gambarDemo({ seed: 2, litter: 70 }), format: 'png' }, 'pembersihan');

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  const pwRelawan = await hashPassword(process.env.SEED_DEMO_PASSWORD || 'Relawan123!');
  const pwVerif = await hashPassword(process.env.SEED_VERIFIER_PASSWORD || 'Verifikator123!');
  const pwAdmin = await hashPassword(adminPassword);

  await withTransaction(async (c) => {
    const komIds = [];
    for (const [nama, desk, wil, ver] of KOMUNITAS) {
      const r = await c.query('INSERT INTO komunitas (nama_komunitas, deskripsi_komunitas, wilayah, terverifikasi) VALUES ($1,$2,$3,$4) RETURNING id_komunitas', [nama, desk, wil, ver]);
      komIds.push(r.rows[0].id_komunitas);
    }
    const ins = async (nama, email, pw, peran, kom, poin, instansi = null) => {
      const r = await c.query(
        `INSERT INTO akun_relawan (nama, email, password_hash, peran, id_komunitas, total_poin, instansi, dibuat)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now() - interval '40 days') RETURNING id_relawan`, [nama, email, pw, peran, kom, poin, instansi]);
      return r.rows[0].id_relawan;
    };
    const admin = await ins('Admin SeaGuard', 'admin@seaguard.test', pwAdmin, 'Admin', null, 0, 'Tim SeaGuard');
    const verif = await ins('Rina Hapsari', 'verifikator@seaguard.test', pwVerif, 'Verifikator', null, 0, 'Dinas Lingkungan Hidup (demo)');
    const relawan = [];
    for (const [nama, mail, k, poin] of RELAWAN) {
      relawan.push(await ins(nama, `${mail}@seaguard.test`, pwRelawan, 'Relawan', k == null ? null : komIds[k], poin));
    }
    // Two well-known test logins on top of the named volunteers.
    const relawan1 = await ins('Relawan Satu', 'relawan1@seaguard.test', pwRelawan, 'Relawan', komIds[4], 24);
    const relawan2 = await ins('Relawan Dua', 'relawan2@seaguard.test', pwRelawan, 'Relawan', komIds[0], 52);

    // Points ledger matching the seeded totals, spread over the last weeks.
    for (let i = 0; i < relawan.length; i += 1) {
      const total = RELAWAN[i][3];
      if (!total) continue;
      const a = Math.round(total * 0.6);
      await c.query(`INSERT INTO riwayat_poin (id_relawan, poin, dibuat) VALUES ($1,$2, now() - interval '30 days'), ($1,$3, now() - make_interval(days => $4))`,
        [relawan[i], a, total - a, 1 + (i % 6)]);
    }
    await c.query(`INSERT INTO riwayat_poin (id_relawan, poin, dibuat) VALUES ($1, 24, now() - interval '20 days'), ($2, 52, now() - interval '3 days')`, [relawan1, relawan2]);

    const pelapor = [...relawan.slice(0, 10), relawan1, relawan2];
    const ids = [];
    const logs = [];
    for (let i = 0; i < LAPORAN.length; i += 1) {
      const [lat, lon, ind, status, days, nama, jenis] = LAPORAN[i];
      const by = pelapor[i % pelapor.length];
      const r = await c.query(
        `INSERT INTO laporan_pencemaran (id_relawan, koordinat_gps, sumber_koordinat, indikator_tingkat, jenis_sampah, perkiraan_volume, deskripsi,
           lokasi_nama, tanggal_laporan, status_laporan, diverifikasi_oleh, diverifikasi_pada, catatan_verifikasi, dibersihkan_pada)
         VALUES ($1, ${pointSql('$2', '$3')}, 'perangkat', $4, $5, $6, $7, $8, now() - make_interval(secs => $9::float8 * 86400), $10,
           CASE WHEN $10 = 'Menunggu Verifikasi' THEN NULL ELSE $11::uuid END,
           CASE WHEN $10 = 'Menunggu Verifikasi' THEN NULL ELSE now() - make_interval(secs => ($9::float8 - 0.5) * 86400) END,
           CASE WHEN $10 = 'Ditolak' THEN 'Photo shows a different beach than the coordinates.' ELSE NULL END,
           CASE WHEN $10 = 'Dibersihkan' THEN now() - make_interval(days => 5) ELSE NULL END)
         RETURNING id_laporan, kode`,
        [by, lon, lat, ind, jenis, ind === 'Berbahaya' ? 'besar' : ind === 'Waspada' ? 'sedang' : 'kecil', DESKRIPSI[ind], nama, days, status, verif]);
      ids.push(r.rows[0]);
      await c.query(
        `INSERT INTO bukti_laporan (id_laporan, foto_url, ukuran_file, format_file, metadata_exif, gps_exif)
         VALUES ($1,$2,$3,'png',$4, ${pointSql('$5', '$6')})`,
        [r.rows[0].id_laporan, fotoKotor[i % fotoKotor.length], 120000 + i * 731, { lat: lat + 0.00008, lon: lon - 0.00006, kamera: 'Demo image (synthetic)' }, lon - 0.00006, lat + 0.00008]);
      if (status !== 'Menunggu Verifikasi') {
        logs.push({ jenis: 'laporan', id: r.rows[0].id_laporan, kode: r.rows[0].kode, status: status === 'Ditolak' ? 'Ditolak' : 'Disetujui', hariLalu: days - 0.5 });
      }
    }
    // Pantai Kuta (index 6) is claimed by relawan2, with a cleanup waiting for verification.
    const kuta = ids[6];
    const kl = await c.query(
      `INSERT INTO klaim_titik_pencemaran (id_laporan, id_relawan, koordinat_titik, wkt_klaim, batas_waktu, status_klaim)
       SELECT id_laporan, $2, koordinat_gps, now() - interval '2 days', now() + interval '5 days', 'Menunggu Verifikasi'
       FROM laporan_pencemaran WHERE id_laporan = $1 RETURNING id_klaim`, [kuta.id_laporan, relawan2]);
    const pb = await c.query(
      `INSERT INTO laporan_pembersihan (id_klaim, id_relawan, deskripsi_kegiatan, jumlah_peserta, perkiraan_berat_kg, tgl_selesai)
       VALUES ($1,$2,'Six of us cleared the tide line from the lifeguard tower to the drain outlet. Mostly bottles, sandals and foam.', 6, 38.5, now() - interval '5 hours')
       RETURNING id_pembersihan`, [kl.rows[0].id_klaim, relawan2]);
    await c.query(
      `INSERT INTO bukti_pembersihan (id_pembersihan, foto_before_url, foto_after_url, gps_before, gps_after, sumber_gps_before, sumber_gps_after, jarak_before_m, jarak_after_m)
       VALUES ($1,$2,$3, ${pointSql('115.16872', '-8.71848')}, ${pointSql('115.16851', '-8.71830')}, 'exif', 'perangkat', 14.2, 21.7)`,
      [pb.rows[0].id_pembersihan, fotoSebelum, fotoBersih]);
    // Finished history for the two cleaned points.
    for (const [idx, who, poin] of [[37, relawan[0], 64], [38, relawan[1], 88]]) {
      const k2 = await c.query(
        `INSERT INTO klaim_titik_pencemaran (id_laporan, id_relawan, koordinat_titik, wkt_klaim, batas_waktu, status_klaim)
         SELECT id_laporan, $2, koordinat_gps, now() - interval '9 days', now() - interval '2 days', 'Selesai' FROM laporan_pencemaran WHERE id_laporan = $1 RETURNING id_klaim`,
        [ids[idx].id_laporan, who]);
      const p2 = await c.query(
        `INSERT INTO laporan_pembersihan (id_klaim, id_relawan, deskripsi_kegiatan, jumlah_peserta, perkiraan_berat_kg, tgl_selesai, status_pembersihan, poin_diberikan, diverifikasi_oleh, diverifikasi_pada)
         VALUES ($1,$2,'Community cleanup with local fishers, sorted into recyclables and residue.', 9, 52, now() - interval '6 days', 'Disetujui', $3, $4, now() - interval '5 days')
         RETURNING id_pembersihan, kode`, [k2.rows[0].id_klaim, who, poin, verif]);
      await c.query(
        `INSERT INTO bukti_pembersihan (id_pembersihan, foto_before_url, foto_after_url, gps_before, gps_after, jarak_before_m, jarak_after_m)
         SELECT $1, $2, $3, koordinat_gps, koordinat_gps, 3, 5 FROM laporan_pencemaran WHERE id_laporan = $4`,
        [p2.rows[0].id_pembersihan, fotoSebelum, fotoBersih, ids[idx].id_laporan]);
      logs.push({ jenis: 'pembersihan', id: p2.rows[0].id_pembersihan, kode: p2.rows[0].kode, status: 'Disetujui', hariLalu: 5 });
    }
    // The audit log is append-only, so write it in time order: the # sequence and timestamps agree.
    logs.sort((a, b) => b.hariLalu - a.hariLalu);
    for (const g of logs) {
      await c.query(`INSERT INTO log_verifikasi (id_verifikator, jenis_objek, id_objek, kode_objek, status_keputusan, timestamp)
        VALUES ($1,$2,$3,$4,$5, now() - make_interval(secs => $6::float8 * 86400))`, [verif, g.jenis, g.id, g.kode, g.status, g.hariLalu]);
    }
    await c.query(`INSERT INTO notifikasi (id_relawan, jenis, judul, pesan, data) VALUES
      ($1, 'selamat_datang', 'Welcome to SeaGuard', 'Pick a hotspot on the heatmap and claim it.', '{}'::jsonb)`, [relawan1]);
    void admin;
  });
  if (!process.env.SEED_ADMIN_PASSWORD) console.log(`[seed] admin@seaguard.test password (random, set SEED_ADMIN_PASSWORD to choose): ${adminPassword}`);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { migrate } = await import('./migrate.js');
  await migrate();
  await seedJikaKosong({ force: process.argv.includes('--force') });
  await pool.end();
}
