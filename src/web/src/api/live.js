// Real-time channel (Server-Sent Events): notifications, leaderboard and heatmap refreshes.
import { apiUrl, getToken } from './client.js';
import { isNative } from '../lib/platform.js';

const listeners = new Map(); // event -> Set<fn>
let es = null;
let retry = 0;

export function onLive(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event)?.delete(fn);
}

function emit(event, data) {
  for (const fn of listeners.get(event) || []) {
    try { fn(data); } catch (e) { console.error(e); }
  }
}

export function connectLive() {
  disconnectLive();
  const t = getToken();
  const url = apiUrl(`/api/stream${isNative && t ? `?token=${encodeURIComponent(t)}` : ''}`);
  es = new EventSource(url, { withCredentials: !isNative });
  for (const ev of ['notifikasi', 'leaderboard', 'heatmap', 'antrean', 'halo']) {
    es.addEventListener(ev, (m) => {
      retry = 0;
      let data = null;
      try { data = JSON.parse(m.data); } catch { /* ignore */ }
      emit(ev, data);
    });
  }
  es.onerror = () => {
    if (es?.readyState === EventSource.CLOSED) {
      const wait = Math.min(30000, 2000 * 2 ** retry++);
      setTimeout(connectLive, wait);
    }
  };
}

export function disconnectLive() {
  if (es) { es.close(); es = null; }
}
