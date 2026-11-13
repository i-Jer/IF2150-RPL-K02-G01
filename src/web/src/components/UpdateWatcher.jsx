import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { useI18n } from '../i18n/index.jsx';
import { isNative } from '../lib/platform.js';
import { periksaPembaruan, siapkanUpdater } from '../lib/updater.js';
import { Dialog } from './ui.jsx';

/** Checks for updates on launch and whenever the app returns to the foreground. */
export function UpdateWatcher() {
  const { t } = useI18n();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (!isNative) return undefined;
    let alive = true;
    const check = async () => {
      try {
        const r = await periksaPembaruan();
        if (alive && (r.jenis === 'bundle' || r.jenis === 'native')) setPending(r);
      } catch (e) { console.warn('update check failed', e); }
    };
    siapkanUpdater().then(check);
    const sub = App.addListener('resume', check);
    const timer = setInterval(check, 30 * 60 * 1000);
    return () => { alive = false; clearInterval(timer); sub.then((s) => s.remove()).catch(() => {}); };
  }, []);

  if (!pending) return null;
  if (pending.jenis === 'bundle') {
    return (
      <Dialog title={t('update.ready')} onClose={() => setPending(null)}
        actions={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>{t('update.later')}</button>
            <button type="button" className="btn btn-primary" onClick={() => pending.terapkan()}>{t('update.restart')}</button>
          </>
        )}>
        <p className="muted">{t('update.ready.b', { v: pending.versi.split('+')[0] })}</p>
      </Dialog>
    );
  }
  return (
    <Dialog title={t('update.native', { v: pending.versi })} onClose={pending.wajib ? undefined : () => setPending(null)}
      actions={(
        <>
          {pending.wajib ? <span /> : <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>{t('update.later')}</button>}
          <button type="button" className="btn btn-primary" onClick={() => pending.unduh()}>{t('update.download')}</button>
        </>
      )}>
      <p className="muted">{t('update.native.b')}</p>
    </Dialog>
  );
}
