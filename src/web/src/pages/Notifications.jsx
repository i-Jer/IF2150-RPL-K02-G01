import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, CheckCheck } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api } from '../api/client.js';
import { onLive } from '../api/live.js';
import { Empty, Notice } from '../components/ui.jsx';
import { relTime } from '../lib/platform.js';

export function notifText(t, n) {
  const d = n.data || {};
  const tk = `notif.${n.jenis}`;
  const title = t(tk, d) === tk ? n.judul : t(tk, d);
  const bk = `${tk}.b`;
  let body = t(bk, d) === bk ? (d.catatan || n.pesan) : t(bk, d);
  if (n.jenis.endsWith('ditolak') && d.catatan) body = d.catatan;
  return { title, body, warned: !!d.teguran };
}

export default function Notifications() {
  const { t, lang } = useI18n();
  const { setUnread } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const load = useCallback(async () => {
    try { const r = await api.get('/notifikasi'); setData(r); setErr(null); } catch (e) { setErr(e); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => onLive('notifikasi', load), [load]);

  async function readAll() {
    await api.post('/notifikasi/dibaca', { ids: 'semua' }).catch(() => {});
    setUnread(0); load();
  }
  async function readOne(n) {
    if (n.dibaca) return;
    await api.post('/notifikasi/dibaca', { ids: [n.idNotifikasi] }).catch(() => {});
    setUnread((u) => Math.max(0, u - 1));
    setData((d) => ({ ...d, daftar: d.daftar.map((x) => (x.idNotifikasi === n.idNotifikasi ? { ...x, dibaca: true } : x)) }));
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>{t('notif.title')}</h1>
        {data?.belumDibaca ? <button type="button" className="btn btn-ghost btn-sm" onClick={readAll}><CheckCheck size={16} aria-hidden="true" />{t('notif.readAll')}</button> : null}
      </div>
      {err ? <Notice kind="bad">{errText(t, err)}</Notice> : null}
      <div className="card" style={{ padding: 0 }}>
        {!data ? <div style={{ padding: 20 }} className="stack-sm">{[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 56 }} />)}</div>
          : !data.daftar.length ? <Empty icon={BellOff} title={t('notif.empty')} />
            : (
              <ul className="notifs">
                {data.daftar.map((n) => {
                  const x = notifText(t, n);
                  const inner = (
                    <>
                      <span className={`ndot ${n.dibaca ? '' : 'on'} ${n.jenis.endsWith('ditolak') ? 'bad' : ''}`} aria-hidden="true" />
                      <span className="nbody">
                        <b>{x.title}</b>
                        {x.body ? <span>{x.body}</span> : null}
                        {x.warned ? <span className="err">{t('notif.warned')}</span> : null}
                        <small>{relTime(n.dibuat, lang)}</small>
                      </span>
                    </>
                  );
                  return (
                    <li key={n.idNotifikasi} className={n.dibaca ? '' : 'unread'}>
                      {n.tautan ? <Link to={n.tautan} onClick={() => readOne(n)}>{inner}</Link> : <button type="button" onClick={() => readOne(n)}>{inner}</button>}
                    </li>
                  );
                })}
              </ul>
            )}
      </div>
    </div>
  );
}
