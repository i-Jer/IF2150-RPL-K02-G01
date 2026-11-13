// C24 Notifikasi: stores in-app notifications and pushes them in real time over Server-Sent Events
// (KF11, KNF04 < 5 s). Also broadcasts leaderboard/heatmap/queue changes to every open client (KNF08).
import { db } from '../db/pool.js';

const klien = new Map(); // idRelawan -> Set<res>
const semua = new Set(); // every open stream (signed in or not)
const verifikator = new Set();

function tulis(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch { /* closed */ }
}

export class Notifikasi {
  /** Attach an SSE response. */
  static sambung(req, res, akun) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    res.write('retry: 4000\n\n');
    semua.add(res);
    if (akun) {
      if (!klien.has(akun.idRelawan)) klien.set(akun.idRelawan, new Set());
      klien.get(akun.idRelawan).add(res);
      if (akun.peran !== 'Relawan') verifikator.add(res);
    }
    tulis(res, 'halo', { waktu: new Date().toISOString() });
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      semua.delete(res);
      verifikator.delete(res);
      if (akun) {
        const set = klien.get(akun.idRelawan);
        set?.delete(res);
        if (set && !set.size) klien.delete(akun.idRelawan);
      }
    });
  }

  /**
   * kirimNotifikasi(idRelawan, status): persists the notification then pushes it to the
   * volunteer's open sessions. Payload uses translation keys so each client renders its language.
   */
  static async kirimNotifikasi(idRelawan, { jenis, judul, pesan, tautan = null, data = null }, client) {
    const { rows } = await db(client).query(
      `INSERT INTO notifikasi (id_relawan, jenis, judul, pesan, tautan, data) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id_notifikasi, dibuat`, [idRelawan, jenis, judul, pesan, tautan, data]);
    const n = { idNotifikasi: rows[0].id_notifikasi, jenis, judul, pesan, tautan, data, dibaca: false, dibuat: rows[0].dibuat };
    return n;
  }

  /** Push after the surrounding transaction committed. */
  static dorong(idRelawan, notifikasi) {
    for (const res of klien.get(idRelawan) || []) tulis(res, 'notifikasi', notifikasi);
  }

  static siarkan(event, data) {
    for (const res of semua) tulis(res, event, data);
  }

  static siarkanVerifikator(event, data) {
    for (const res of verifikator) tulis(res, event, data);
  }

  static async getDaftar(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT id_notifikasi, jenis, judul, pesan, tautan, data, dibaca, dibuat FROM notifikasi WHERE id_relawan = $1
       ORDER BY dibuat DESC LIMIT 100`, [idRelawan]);
    const belum = await db(client).query('SELECT count(*)::int AS n FROM notifikasi WHERE id_relawan = $1 AND NOT dibaca', [idRelawan]);
    return {
      belumDibaca: belum.rows[0].n,
      daftar: rows.map((r) => ({ idNotifikasi: r.id_notifikasi, jenis: r.jenis, judul: r.judul, pesan: r.pesan, tautan: r.tautan, data: r.data, dibaca: r.dibaca, dibuat: r.dibuat })),
    };
  }

  static async tandaiDibaca(idRelawan, ids, client) {
    if (ids === 'semua') {
      await db(client).query('UPDATE notifikasi SET dibaca = true WHERE id_relawan = $1 AND NOT dibaca', [idRelawan]);
    } else {
      await db(client).query('UPDATE notifikasi SET dibaca = true WHERE id_relawan = $1 AND id_notifikasi = ANY($2::bigint[])', [idRelawan, ids]);
    }
  }

  static jumlahKoneksi() { return semua.size; }
}
