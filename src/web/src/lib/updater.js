// In-app updates for the Android build.
// 1) Web bundle OTA: the app downloads the newest bundle zip from the server and swaps to it
//    (Capgo updater, self-hosted manual mode): no APK re-download for UI/logic changes.
// 2) Native shell updates (rare): the app offers the new APK when the native versionCode grows.
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { API_ORIGIN, BUNDLE_VERSION, isNative } from './platform.js';

let started = false;

export async function siapkanUpdater() {
  if (!isNative || started) return;
  started = true;
  // Tell the updater this bundle booted fine; otherwise it rolls back to the previous one.
  try { await CapacitorUpdater.notifyAppReady(); } catch (e) { console.warn('notifyAppReady', e); }
}

async function infoNative() {
  try { const i = await App.getInfo(); return { versionCode: Number(i.build) || 0, versionName: i.version }; } catch { return { versionCode: 0, versionName: '' }; }
}

/**
 * Checks the server. Returns one of:
 *  {jenis:'terbaru'} | {jenis:'bundle', versi, terapkan()} | {jenis:'native', versi, url, unduh()}
 */
export async function periksaPembaruan() {
  if (!isNative) return { jenis: 'web' };
  const res = await fetch(`${API_ORIGIN}/api/app/versi`, { cache: 'no-store' });
  const info = await res.json();
  const nat = await infoNative();
  if (info.native && info.native.versionCode > nat.versionCode) {
    return {
      jenis: 'native', versi: info.native.versionName, url: info.native.url, wajib: !!info.native.wajib,
      unduh: () => Browser.open({ url: info.native.halaman || info.native.url }),
    };
  }
  if (info.bundle && info.bundle.version && info.bundle.version !== BUNDLE_VERSION) {
    const current = await CapacitorUpdater.current().catch(() => null);
    if (current?.bundle?.version === info.bundle.version) return { jenis: 'terbaru' };
    // Served over HTTPS from our own server. The updater refuses any bundle without a checksum, so pass the
    // zip's SHA-256 (hex) from the manifest; the plugin verifies the downloaded file against it.
    const bundle = await CapacitorUpdater.download({ url: info.bundle.url, version: info.bundle.version, checksum: info.bundle.sha256 });
    // Even if the user dismisses the prompt, the new bundle is applied the next time the app is backgrounded or restarted.
    await CapacitorUpdater.next({ id: bundle.id }).catch(() => {});
    return { jenis: 'bundle', versi: info.bundle.version, terapkan: () => CapacitorUpdater.set(bundle) };
  }
  return { jenis: 'terbaru' };
}
