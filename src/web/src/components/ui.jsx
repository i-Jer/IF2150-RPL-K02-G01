import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Check, Loader2, X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';

/* ---------- hotspot code: category dot + mono code ---------- */
export function LotTag({ kode, kat, size, muted }) {
  if (!kode) return null;
  return <span className={`tag ${size === 'lg' ? 'lg' : ''} ${muted ? 'k-muted' : kat ? `k-${kat}` : ''}`}>{kode}</span>;
}

/* ---------- category label: colour dot + word, never colour alone ---------- */
export function Kat({ k }) {
  const { t } = useI18n();
  if (!k) return null;
  return <span className={`kat ${k}`}>{t(`kat.${k}`)}</span>;
}

/* ---------- status mark in a fixed cell ---------- */
// One shape per meaning, never the category dot: half ring = awaiting review, tick = approved/cleaned,
// filled = held, hollow = open, struck = rejected/suspended.
const MARK = {
  status: { 'Menunggu Verifikasi': 'wait', Disetujui: 'ok', Ditolak: 'no', Diklaim: 'held', Dibersihkan: 'ok' },
  klaim: { Aktif: 'held', 'Menunggu Verifikasi': 'wait', Selesai: 'ok', Dibatalkan: 'open', Kedaluwarsa: 'open', 'Belum diklaim': 'open' },
  akun: { Aktif: 'ok', Ditangguhkan: 'no' },
};
export function Mark({ status, prefix = 'status', bare = false }) {
  const { t } = useI18n();
  const m = MARK[prefix]?.[status] || 'open';
  return (
    <span className={`mark ${m}`} title={bare ? t(`${prefix}.${status}`) : undefined}>
      <i aria-hidden="true">{m === 'ok' ? <Check size={11} strokeWidth={3.2} /> : m === 'no' ? <X size={11} strokeWidth={3.2} /> : null}</i>
      {bare ? <span className="sr-only">{t(`${prefix}.${status}`)}</span> : t(`${prefix}.${status}`)}
    </span>
  );
}

export function Spinner({ size = 18 }) {
  return <Loader2 size={size} className="spin" aria-hidden="true" />;
}

export function Notice({ kind = 'info', children }) {
  const Icon = kind === 'ok' ? CheckCircle2 : kind === 'bad' || kind === 'warn' ? AlertTriangle : Info;
  return <div className={`notice ${kind}`} role={kind === 'bad' ? 'alert' : 'status'}><Icon size={18} aria-hidden="true" /><div>{children}</div></div>;
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon ? <Icon size={34} aria-hidden="true" /> : null}
      <b>{title}</b>
      {children ? <p style={{ maxWidth: '44ch' }}>{children}</p> : null}
      {action}
    </div>
  );
}

/* ---------- dialog ---------- */
export function Dialog({ title, children, onClose, actions, labelledBy = 'dlg-title' }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('button, [href], input, select, textarea')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref}>
        <h2 id={labelledBy}>{title}</h2>
        <div>{children}</div>
        {actions ? <div className="actions">{actions}</div> : null}
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x.slice(-2), { id, kind: 'info', ...t }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), t.ms || 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.kind}`}>
            <span className="bar" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <b>{i.title}</b>
              {i.body ? <p>{i.body}</p> : null}
              {i.action ? <div style={{ marginTop: 8 }}>{i.action}</div> : null}
            </div>
            <button className="iconbtn" style={{ width: 32, height: 32 }} aria-label={t('common.close')} onClick={() => setItems((x) => x.filter((y) => y.id !== i.id))}><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- async loader hook ---------- */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(async (silent) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ loading: false, data, error: null });
      return data;
    } catch (error) {
      setState((s) => ({ loading: false, data: silent ? s.data : null, error }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
