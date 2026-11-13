import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { Empty, Notice, useLoad } from '../components/ui.jsx';
import { fmtDateTime } from '../lib/platform.js';

const JENIS = ['', 'laporan', 'pembersihan', 'akun', 'komunitas'];

export default function AuditLog() {
  const { t, lang } = useI18n();
  const [jenis, setJenis] = useState('');
  const log = useLoad(() => api.get(`/verifikasi/log?limit=300${jenis ? `&jenis=${jenis}` : ''}`), [jenis]);
  const label = { '': t('common.seeAll'), laporan: t('nav.queue'), pembersihan: t('nav.cleanups'), akun: t('admin.accounts'), komunitas: t('admin.communities') };
  return (
    <div className="page wide">
      <div className="page-head">
        <div><h1><Lock size={22} aria-hidden="true" style={{ verticalAlign: -2, marginRight: 8 }} />{t('audit.title')}</h1><p>{t('audit.body')}</p></div>
        <select className="select" style={{ width: 'auto' }} value={jenis} onChange={(e) => setJenis(e.target.value)} aria-label={t('audit.title')}>
          {JENIS.map((j) => <option key={j} value={j}>{label[j]}</option>)}
        </select>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {log.error ? <div style={{ padding: 16 }}><Notice kind="bad">{errText(t, log.error)}</Notice></div>
          : log.loading ? <div style={{ padding: 16 }} className="skel" />
            : !log.data.length ? <Empty title={t('common.none')} />
              : (
                <table className="table">
                  <thead><tr><th className="num hide-sm">#</th><th>{t('audit.time')}</th><th>{t('vr.col.id')}</th><th>{t('admin.status')}</th><th>{t('role.Verifikator')}</th><th className="hide-sm">{t('audit.reason')}</th></tr></thead>
                  <tbody>
                    {log.data.map((g) => (
                      <tr key={g.idLog} style={{ cursor: 'default' }}>
                        <td className="num muted hide-sm">{g.idLog}</td>
                        <td className="audit-time">{fmtDateTime(g.timestamp, lang)}</td>
                        <td><span className="tag k-muted" style={{ height: 22, fontSize: 16 }}>{g.kodeObjek}</span></td>
                        <td>{t(`status.${g.statusKeputusan}`).startsWith('status.') ? g.statusKeputusan : t(`status.${g.statusKeputusan}`)}</td>
                        <td>{g.namaVerifikator}<div className="muted small">{g.kodeVerifikator}</div></td>
                        <td className="hide-sm small">{g.catatan || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
      </div>
    </div>
  );
}
