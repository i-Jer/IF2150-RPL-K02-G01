// Real-time channel (Server-Sent Events): notifications, leaderboard and heatmap refreshes.
import { apiUrl, getToken } from './client.js';
import { isNative } from '../lib/platform.js';

const listeners = new Map(); // event -> Set<fn>
let es = null;
let retry = 0;
let ingin = false; // the app wants a stream (connectLive called)
let tutupTimer = null;
let ditutupKarenaSembunyi = false;
const JEDA_SEMBUNYI = 60 * 1000;

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
  ingin = true;
  if (typeof document !== 'undefined' && document.hidden) { ditutupKarenaSembunyi = true; return; }
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
      setTimeout(() => {
        if (!ingin) return;
        if (document.hidden) { ditutupKarenaSembunyi = true; return; }
        connectLive();
      }, wait);
    }
  };
}

export function disconnectLive() {
  ingin = false;
  if (es) { es.close(); es = null; }
}

// A tab or app left in the background closes its stream after a minute, so an idle server has no open
// connections and can sleep. Coming back reconnects and tells every page to reload what it may have missed.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(tutupTimer);
      tutupTimer = setTimeout(() => {
        if (es) { es.close(); es = null; ditutupKarenaSembunyi = true; }
      }, JEDA_SEMBUNYI);
      return;
    }
    clearTimeout(tutupTimer);
    if (ditutupKarenaSembunyi && ingin) {
      ditutupKarenaSembunyi = false;
      connectLive();
      emit('heatmap', { alasan: 'kembali' });
      emit('leaderboard', { alasan: 'kembali' });
      emit('antrean', { jenis: 'laporan' });
      emit('antrean', { jenis: 'pembersihan' });
      emit('kembali', null);
    }
  });
}
