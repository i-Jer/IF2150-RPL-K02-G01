// C25 Autentikasi: sessions, roles (RBAC), login lockout (KNF09), password hashing (R25) and consent log (KNF02).
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, query } from '../db/pool.js';
import { config } from '../config.js';
import { AkunRelawan } from '../models/AkunRelawan.js';
import { AppError, bad, conflict, unauthorized } from '../utils/errors.js';

// Constant-time-ish path for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('seaguard-dummy-password', 10);
const hashToken =(t) => crypto.createHmac('sha256', config.sessionSecret).update(t).digest('hex');

export function validasiPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8 || pw.length > 128) throw bad('PASSWORD_WEAK', 'Password must be at least 8 characters.');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw bad('PASSWORD_WEAK', 'Use letters and at least one number.');
}

export const hashPassword = (pw) => bcrypt.hash(pw, 10);

/** Role hierarchy: Admin can do everything a Verifikator can (Algo-005: Admin and Verifikator are one actor). */
const TINGKAT = { Relawan: 1, Verifikator: 2, Admin: 3 };

export class Autentikasi {
  static async buatSesi(idRelawan, perangkat) {
    const token = crypto.randomBytes(32).toString('base64url');
    await query(
      `INSERT INTO sesi (id_sesi, id_relawan, kedaluwarsa, perangkat) VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
      [hashToken(token), idRelawan, config.sessionDays, String(perangkat || '').slice(0, 200)]);
    return token;
  }

  /** Login with KNF09: 5 consecutive failures lock the account for 15 minutes. */
  static async login(email, password, perangkat) {
    const akun = await AkunRelawan.cariDenganEmail(email);
    // Same generic error for unknown email and wrong password (no account enumeration).
    const gagal = () => unauthorized('LOGIN_FAILED', 'Email or password is incorrect.');
    if (!akun) { await bcrypt.compare(String(password || ''), DUMMY_HASH); throw gagal(); }
    if (akun.waktu_kunci && new Date(akun.waktu_kunci) > new Date()) {
      const menit = Math.ceil((new Date(akun.waktu_kunci) - Date.now()) / 60000);
      throw new AppError(423, 'ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${menit} minute(s).`, { menit });
    }
    if (akun.status_akun === 'Ditangguhkan') throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended. Contact an administrator.');
    const ok = await bcrypt.compare(String(password || ''), akun.password_hash);
    if (!ok) {
      // Reset the counter when a previous lock already expired.
      const { rows } = await query(
        `UPDATE akun_relawan SET
           jumlah_gagal_login = CASE WHEN waktu_kunci IS NOT NULL AND waktu_kunci <= now() THEN 1 ELSE jumlah_gagal_login + 1 END,
           waktu_kunci = CASE WHEN waktu_kunci IS NOT NULL AND waktu_kunci <= now() THEN NULL ELSE waktu_kunci END
         WHERE id_relawan = $1 RETURNING jumlah_gagal_login`, [akun.id_relawan]);
      const n = rows[0].jumlah_gagal_login;
      if (n >= config.rules.loginMaxFail) {
        await query(`UPDATE akun_relawan SET waktu_kunci = now() + make_interval(mins => $2), jumlah_gagal_login = 0 WHERE id_relawan = $1`,
          [akun.id_relawan, config.rules.loginLockMinutes]);
        throw new AppError(423, 'ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${config.rules.loginLockMinutes} minute(s).`, { menit: config.rules.loginLockMinutes });
      }
      throw new AppError(401, 'LOGIN_FAILED', 'Email or password is incorrect.', { sisa: config.rules.loginMaxFail - n });
    }
    await query('UPDATE akun_relawan SET jumlah_gagal_login = 0, waktu_kunci = NULL WHERE id_relawan = $1', [akun.id_relawan]);
    const token = await Autentikasi.buatSesi(akun.id_relawan, perangkat);
    return { token, akun: await AkunRelawan.getDetailAkun(akun.id_relawan) };
  }

  static async daftar({ nama, email, password, bahasa, idKomunitas }, perangkat) {
    validasiPassword(password);
    AkunRelawan.validasiData({ nama, email });
    if (await AkunRelawan.cariDenganEmail(email)) throw conflict('EMAIL_TAKEN', 'An account with this email already exists.');
    const akun = await AkunRelawan.buatAkun({ nama, email, passwordHash: await hashPassword(password), bahasa, idKomunitas: idKomunitas || null });
    const token = await Autentikasi.buatSesi(akun.idRelawan, perangkat);
    return { token, akun };
  }

  static async logout(token) {
    if (token) await query('DELETE FROM sesi WHERE id_sesi = $1', [hashToken(token)]);
  }

  static async gantiPassword(idRelawan, lama, baru, tokenSekarang) {
    validasiPassword(baru);
    const { rows } = await query('SELECT password_hash FROM akun_relawan WHERE id_relawan = $1', [idRelawan]);
    if (!rows[0] || !(await bcrypt.compare(String(lama || ''), rows[0].password_hash))) throw bad('PASSWORD_WRONG', 'Current password is incorrect.');
    await AkunRelawan.setPassword(idRelawan, await hashPassword(baru));
    // Sign out every other device.
    await query('DELETE FROM sesi WHERE id_relawan = $1 AND id_sesi <> $2', [idRelawan, hashToken(tokenSekarang || '')]);
  }

  /** Resolve the account behind a token (null when invalid/expired). */
  static async akunDariToken(token) {
    if (!token) return null;
    const { rows } = await query(
      `SELECT a.id_relawan, a.peran, a.status_akun, a.waktu_kunci FROM sesi s JOIN akun_relawan a ON a.id_relawan = s.id_relawan
       WHERE s.id_sesi = $1 AND s.kedaluwarsa > now()`, [hashToken(token)]);
    return rows[0] || null;
  }

  /**
   * Algo-005 cekSesiDanPeran(idSesi, peran): the session is active, the account is not locked
   * or suspended, and the role matches (Admin satisfies Verifikator).
   */
  static async cekSesiDanPeran(token, peran) {
    const a = await Autentikasi.akunDariToken(token);
    if (!a) return { ok: false, status: 401 };
    if (a.waktu_kunci && new Date(a.waktu_kunci) > new Date()) return { ok: false, status: 401 };
    if (a.status_akun === 'Ditangguhkan') return { ok: false, status: 403, code: 'ACCOUNT_SUSPENDED' };
    if (peran && TINGKAT[a.peran] < TINGKAT[peran]) return { ok: false, status: 403 };
    if (peran === 'Relawan' && a.peran !== 'Relawan') return { ok: false, status: 403, code: 'RELAWAN_ONLY' };
    return { ok: true, akun: { idRelawan: a.id_relawan, peran: a.peran } };
  }

  /** KNF02: record consent decisions for location/camera access. */
  static async catatConsent(idRelawan, jenis, keputusan, perangkat, ip, client) {
    if (!['lokasi_kamera', 'lokasi', 'kamera'].includes(jenis)) throw bad('CONSENT_INVALID', 'Unknown consent type.');
    if (!['Izinkan', 'Tolak'].includes(keputusan)) throw bad('CONSENT_INVALID', 'Unknown consent decision.');
    await db(client).query(
      'INSERT INTO consent_log (id_relawan, jenis, keputusan, perangkat, alamat_ip) VALUES ($1,$2,$3,$4,$5)',
      [idRelawan, jenis, keputusan, String(perangkat || '').slice(0, 200), ip || null]);
  }

  static async sudahConsent(idRelawan, client) {
    const { rows } = await db(client).query(
      `SELECT keputusan, waktu FROM consent_log WHERE id_relawan = $1 ORDER BY waktu DESC LIMIT 1`, [idRelawan]);
    return rows[0] ? { keputusan: rows[0].keputusan, waktu: rows[0].waktu } : null;
  }
}
