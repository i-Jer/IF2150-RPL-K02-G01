// Platform helpers shared by the web app and the Android (Capacitor) app.
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();
/* global __API_ORIGIN__, __BUNDLE_VERSION__ */
export const API_ORIGIN = isNative ? __API_ORIGIN__ : '';
export const BUNDLE_VERSION = __BUNDLE_VERSION__;

/** Key/value storage: Capacitor Preferences in the app, localStorage on the web. */
export const store = {
  async get(key) {
    if (isNative) return (await Preferences.get({ key })).value;
    try { return localStorage.getItem(key); } catch { return null; }
  },
  async set(key, value) {
    if (isNative) return Preferences.set({ key, value });
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  },
  async remove(key) {
    if (isNative) return Preferences.remove({ key });
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export function fmtDate(d, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '';
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', opts).format(new Date(d));
}
export function fmtDateTime(d, lang) {
  return fmtDate(d, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function relTime(d, lang) {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === 'id' ? 'id' : 'en', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}
export const fmtNum = (n, lang) => new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US').format(n ?? 0);
export const fmtCoord = (lat, lon) => (lat == null ? '' : `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`);
export const daysSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

/** Status-bar icons: white over the deep-navy field (landing, download, sign-in, first launch), dark over pearl. */
export function warnaStatusBar(gelap) {
  if (!isNative) return;
  SystemBars.setStyle({ style: gelap ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
}

/** Distance for people: "640 m" under 1 km, "1.8 km" under 10 km, "113 km" beyond (locale digits). */
export function fmtJarak(meter, lang) {
  const m = Math.max(0, Number(meter) || 0);
  const loc = lang === 'id' ? 'id-ID' : 'en-GB';
  if (m < 1000) return `${Math.round(m).toLocaleString(loc)} m`;
  const km = m / 1000;
  return `${km.toLocaleString(loc, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
