// HTTP client. Web: same-origin + HttpOnly cookie. App: absolute API origin + Bearer token.
import { API_ORIGIN, isNative, store } from '../lib/platform.js';

let token = null;
export async function loadToken() { token = isNative ? await store.get('sg.token') : null; return token; }
export async function setToken(t) { token = t; if (isNative) { if (t) await store.set('sg.token', t); else await store.remove('sg.token'); } }
export const getToken = () => token;
export const apiUrl = (path) => `${API_ORIGIN}${path}`;
/** Photo URLs come back as /api/foto/...; make them absolute inside the app. */
export const mediaUrl = (u) => (!u ? '' : u.startsWith('http') ? u : `${API_ORIGIN}${u}`);

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `HTTP ${status}`);
    this.status = status;
    this.code = body?.error?.code || (status === 0 ? 'NETWORK' : 'SERVER_ERROR');
    this.details = body?.error?.details;
  }
}

async function request(method, path, { body, form, signal } = {}) {
  const headers = { 'X-SeaGuard-Client': isNative ? 'android-app' : 'web' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(apiUrl(`/api${path}`), {
      method, headers, signal, credentials: isNative ? 'omit' : 'include',
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, null);
  }
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    const err = new ApiError(res.status, json);
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new CustomEvent('sg:unauthorized'));
    throw err;
  }
  return json;
}

export const api = {
  get: (p, o) => request('GET', p, o),
  post: (p, body, o) => request('POST', p, { ...o, body }),
  put: (p, body, o) => request('PUT', p, { ...o, body }),
  patch: (p, body, o) => request('PATCH', p, { ...o, body }),
  /**
   * Multipart upload with automatic retry on network failure, at most 3 attempts (KNF01).
   * onRetry(n) lets the form show "Retrying (n/3)".
   */
  async upload(p, formData, { onRetry } = {}) {
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await request('POST', p, { form: formData });
      } catch (e) {
        lastErr = e;
        if (!(e instanceof ApiError) || (e.status !== 0 && e.status < 500)) throw e;
        if (attempt < 3) {
          onRetry?.(attempt + 1);
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
    }
    throw lastErr;
  },
};
