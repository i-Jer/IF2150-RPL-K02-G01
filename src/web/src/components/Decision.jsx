import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { Notice, Spinner } from './ui.jsx';
import { Field } from './Field.jsx';

/** Approve / reject with a required reason on reject and an optional warning (R18). */
export function Decision({ onDecide }) {
  const { t } = useI18n();
  const [mode, setMode] = useState(null); // null | 'tolak'
  const [catatan, setCatatan] = useState('');
  const [teguran, setTeguran] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState(null);
  const [alasanErr, setAlasanErr] = useState('');

  async function go(keputusan) {
    setErr(null); setAlasanErr('');
    // A rejection needs a reason the volunteer can act on: say so under the box instead of greying out the button.
    if (keputusan === 'Ditolak' && catatan.trim().length < 5) { setAlasanErr(t('e.REASON_REQUIRED')); document.getElementById('alasan')?.focus(); return; }
    setBusy(keputusan);
    try { await onDecide({ keputusan, catatan: catatan.trim() || undefined, teguran: keputusan === 'Ditolak' ? teguran : false }); setMode(null); setCatatan(''); setTeguran(false); }
    catch (e) { if (e?.code === 'REASON_REQUIRED' || e?.code === 'REASON_TOO_LONG') setAlasanErr(errText(t, e)); else setErr(e); } finally { setBusy(''); }
  }

  return (
    <div className="decision stack-sm">
      {mode === 'tolak' ? (
        <>
          <Field id="alasan" label={t('vr.reason')} error={alasanErr}
            hint={catatan.trim().length < 5 ? `${t('vr.reason.hint')} ${t('vr.reason.count', { n: catatan.trim().length })}` : t('form.charsLeft', { n: 500 - catatan.length })}>
            <textarea id="alasan" className="textarea" style={{ minHeight: 80 }} value={catatan} onChange={(e) => { setCatatan(e.target.value); setAlasanErr(''); }} maxLength={500} autoFocus />
          </Field>
          <label className="switch"><input type="checkbox" checked={teguran} onChange={(e) => setTeguran(e.target.checked)} /><span>{t('vr.warn')}</span></label>
        </>
      ) : null}
      {err ? <Notice kind="bad">{errText(t, err)}</Notice> : null}
      <div className="decision-btns">
        {mode === 'tolak' ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode(null); setErr(null); setAlasanErr(''); }}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-danger" disabled={!!busy} onClick={() => go('Ditolak')}>{busy === 'Ditolak' ? <Spinner size={16} /> : <X size={17} aria-hidden="true" />}{t('common.reject')}</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-danger" onClick={() => setMode('tolak')}><X size={17} aria-hidden="true" />{t('common.reject')}</button>
            <button type="button" className="btn btn-ok" disabled={!!busy} onClick={() => go('Disetujui')}>{busy === 'Disetujui' ? <Spinner size={16} /> : <Check size={17} aria-hidden="true" />}{t('common.approve')}</button>
          </>
        )}
      </div>
    </div>
  );
}
