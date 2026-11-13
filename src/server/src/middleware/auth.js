// Session extraction + RBAC guard. Every controller route runs cekSesiDanPeran (Algo-005) first.
import { Autentikasi } from '../services/Autentikasi.js';
import { AppError, forbidden, unauthorized } from '../utils/errors.js';

export const COOKIE = 'sg_sesi';

export function ambilToken(req, { allowQuery = false } = {}) {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  if (req.cookies?.[COOKIE]) return req.cookies[COOKIE];
  if (allowQuery && typeof req.query.token === 'string') return req.query.token;
  return null;
}

/** wajib('Relawan' | 'Verifikator' | 'Admin' | null): null = any signed-in account. */
export const wajib = (peran = null) => async (req, res, next) => {
  try {
    const token = ambilToken(req);
    const hasil = await Autentikasi.cekSesiDanPeran(token, peran);
    if (!hasil.ok) {
      if (hasil.status === 401) throw unauthorized();
      if (hasil.code === 'ACCOUNT_SUSPENDED') throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
      if (hasil.code === 'RELAWAN_ONLY') throw forbidden('RELAWAN_ONLY', 'Only volunteer accounts can do this.');
      throw forbidden();
    }
    req.token = token;
    req.akun = hasil.akun;
    next();
  } catch (e) { next(e); }
};

/** Attach the account when a valid session exists, never fail. */
export const opsional = async (req, _res, next) => {
  try {
    const token = ambilToken(req, { allowQuery: req.path.endsWith('/stream') });
    const hasil = token ? await Autentikasi.cekSesiDanPeran(token, null) : { ok: false };
    if (hasil.ok) { req.token = token; req.akun = hasil.akun; }
  } catch { /* anonymous */ }
  next();
};
