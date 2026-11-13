import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, RefreshCw, Download, FileWarning } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api, mediaUrl } from '../api/client.js';
import { Empty, Kat, LotTag, Mark, Notice, Spinner, useLoad, useToast } from '../components/ui.jsx';
import { Field, PasswordRules, passwordValid, useFormErrors } from '../components/Field.jsx';
import { BUNDLE_VERSION, fmtDate, fmtNum, isNative } from '../lib/platform.js';
import { periksaPembaruan } from '../lib/updater.js';

function Activity() {
  const { t, lang } = useI18n();
  const lap = useLoad(() => api.get('/pelaporan/saya'), []);
  const kl = useLoad(() => api.get('/klaim/saya'), []);
  const pb = useLoad(() => api.get('/pembersihan/saya'), []);
  return (
    <div className="stack">
      <section className="card">
        <h2>{t('report.mine')}</h2>
        {lap.loading ? <div className="skel" style={{ height: 80, marginTop: 12 }} /> : !lap.data?.length ? <Empty title={t('profile.empty.reports')} action={<Link className="btn btn-primary btn-sm" to="/lapor">{t('report.send')}</Link>} /> : (
          <ul className="list">
            {lap.data.map((l) => (
              <li key={l.idLaporan}>
                {l.fotoUrl ? <img className="thumb" src={mediaUrl(l.fotoUrl)} alt="" loading="lazy" /> : <span className="thumb" />}
                <span className="list-main">
                  <span className="row-flex" style={{ gap: 8 }}><LotTag kode={l.kode} kat={l.indikatorTingkat} /><Kat k={l.indikatorTingkat} /></span>
                  <small>{l.lokasiNama || `${l.lat}, ${l.lon}`} · {fmtDate(l.tanggalLaporan, lang)}</small>
                  {l.statusLaporan === 'Ditolak' && l.catatanVerifikasi ? <small className="err">{l.catatanVerifikasi}</small> : null}
                </span>
                <Mark status={l.statusLaporan} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card">
        <h2>{t('profile.claims')}</h2>
        {kl.loading ? <div className="skel" style={{ height: 60, marginTop: 12 }} /> : !kl.data?.riwayat?.length ? <Empty title={t('profile.empty.claims')} action={<Link className="btn btn-primary btn-sm" to="/peta">{t('cleanup.none.go')}</Link>} /> : (
          <ul className="list">
            {kl.data.riwayat.map((k) => (
              <li key={k.idKlaim}>
                <LotTag kode={k.kode} />
                <span className="list-main"><b>{k.lokasiNama || k.kodeLaporan}</b><small>{fmtDate(k.wktKlaim, lang)} → {fmtDate(k.batasWaktu, lang)}</small></span>
                <Mark status={k.statusKlaim} prefix="klaim" />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card">
        <h2>{t('cleanup.mine')}</h2>
        {pb.loading ? <div className="skel" style={{ height: 60, marginTop: 12 }} /> : !pb.data?.length ? <Empty title={t('profile.empty.cleanups')} action={<Link className="btn btn-ghost btn-sm" to="/peta">{t('cleanup.none.go')}</Link>} /> : (
          <ul className="list">
            {pb.data.map((p) => (
              <li key={p.idPembersihan}>
                <LotTag kode={p.kode} />
                <span className="list-main"><b>{p.lokasiNama}</b><small>{fmtDate(p.tglSelesai, lang)}{p.poinDiberikan ? ` · +${p.poinDiberikan}` : ''}</small>
                  {p.statusPembersihan === 'Ditolak' && p.catatanVerifikasi ? <small className="err">{p.catatanVerifikasi}</small> : null}</span>
                <Mark status={p.statusPembersihan} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const PROF_IDS = { nama: 'pn', email: 'pe', komunitas: 'pk' };
const PW_IDS = { passwordLama: 'po', password: 'pnw' };

function Settings({ akun }) {
  const { t, lang, setLang } = useI18n();
  const { setAkun } = useAuth();
  const toast = useToast();
  const [kom, setKom] = useState([]);
  const [f, setF] = useState({ nama: akun.nama, email: akun.email, idKomunitas: akun.idKomunitas || '' });
  const [pw, setPw] = useState({ passwordLama: '', passwordBaru: '' });
  const [busy, setBusy] = useState('');
  const fe = useFormErrors(PROF_IDS);
  const fw = useFormErrors(PW_IDS);
  useEffect(() => { api.get('/komunitas').then(setKom).catch(() => {}); }, []);

  async function simpan(e) {
    e.preventDefault(); fe.reset();
    if (f.nama.trim().length < 2 || f.nama.trim().length > 80) { fe.setField('nama', t('e.NAME_INVALID')); document.getElementById('pn')?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { fe.setField('email', t('e.EMAIL_INVALID')); document.getElementById('pe')?.focus(); return; }
    setBusy('p');
    try {
      const r = await api.patch('/auth/saya', { nama: f.nama, email: f.email, idKomunitas: f.idKomunitas || null, bahasa: lang });
      setAkun(r.akun); toast({ title: t('profile.saved'), kind: 'ok' });
    } catch (x) { fe.tangkap(x); } finally { setBusy(''); }
  }
  async function gantiPw(e) {
    e.preventDefault(); fw.reset();
    const salah = {};
    if (!pw.passwordLama) salah.passwordLama = t('e.PASSWORD_EMPTY');
    if (!passwordValid(pw.passwordBaru)) salah.password = t('e.PASSWORD_WEAK');
    if (Object.keys(salah).length) { for (const [k, v] of Object.entries(salah)) fw.setField(k, v); document.getElementById(PW_IDS[Object.keys(salah)[0]])?.focus(); return; }
    setBusy('w');
    try { await api.post('/auth/password', pw); setPw({ passwordLama: '', passwordBaru: '' }); toast({ title: t('profile.pw.ok'), kind: 'ok' }); }
    catch (x) { fw.tangkap(x); } finally { setBusy(''); }
  }
  async function bahasa(l) {
    setLang(l);
    api.patch('/auth/saya', { bahasa: l }).catch(() => {});
  }

  return (
    <div className="stack">
      <section className="card stack">
        <h2>{t('profile.language')}</h2>
        <div className="seg" role="group" aria-label={t('profile.language')}>
          <button type="button" aria-pressed={lang === 'en'} onClick={() => bahasa('en')}>English</button>
          <button type="button" aria-pressed={lang === 'id'} onClick={() => bahasa('id')}>Bahasa Indonesia</button>
        </div>
      </section>
      <form className="card stack" onSubmit={simpan}>
        <h2>{t('profile.title')}</h2>
        <div className="grid-2">
          <Field id="pn" label={t('auth.name')} error={fe.errs.nama}><input id="pn" className="input" autoComplete="name" value={f.nama} onChange={(e) => { setF({ ...f, nama: e.target.value }); fe.hapus('nama'); }} /></Field>
          <Field id="pe" label={t('auth.email')} error={fe.errs.email}><input id="pe" className="input" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); fe.hapus('email'); }} /></Field>
        </div>
        <Field id="pk" label={t('profile.community')} optional error={fe.errs.komunitas}>
          <select id="pk" className="select" value={f.idKomunitas} onChange={(e) => { setF({ ...f, idKomunitas: e.target.value }); fe.hapus('komunitas'); }}>
            <option value="">{t('common.none')}</option>
            {kom.map((k) => <option key={k.idKomunitas} value={k.idKomunitas}>{k.namaKomunitas}</option>)}
          </select></Field>
        {fe.umum ? <Notice kind="bad">{errText(t, fe.umum)}</Notice> : null}
        <div><button className="btn btn-primary" disabled={busy === 'p'}>{busy === 'p' ? <Spinner size={16} /> : null}{t('common.save')}</button></div>
      </form>
      <form className="card stack" onSubmit={gantiPw}>
        <h2>{t('profile.password')}</h2>
        <div className="grid-2">
          <Field id="po" label={t('profile.pw.old')} error={fw.errs.passwordLama}><input id="po" className="input" type="password" autoComplete="current-password" value={pw.passwordLama} onChange={(e) => { setPw({ ...pw, passwordLama: e.target.value }); fw.hapus('passwordLama'); }} /></Field>
          <Field id="pnw" label={t('profile.pw.new')} error={fw.errs.password}>
            <input id="pnw" className="input" type="password" autoComplete="new-password" value={pw.passwordBaru} onChange={(e) => { setPw({ ...pw, passwordBaru: e.target.value }); fw.hapus('password'); }} />
            <PasswordRules id="pnw-rules" value={pw.passwordBaru} />
          </Field>
        </div>
        {fw.umum ? <Notice kind="bad">{errText(t, fw.umum)}</Notice> : null}
        <div><button className="btn btn-ghost" disabled={busy === 'w'}>{busy === 'w' ? <Spinner size={16} /> : null}{t('profile.password')}</button></div>
      </form>
    </div>
  );
}

function AppInfo() {
  const { t } = useI18n();
  const [state, setState] = useState('');
  const [detail, setDetail] = useState('');
  async function cek() {
    setState('checking'); setDetail('');
    try {
      const r = await periksaPembaruan();
      if (r.jenis === 'bundle') { setState(''); r.terapkan(); } else if (r.jenis === 'native') { setState(''); r.unduh(); } else setState('latest');
    } catch (e) { setState('error'); setDetail(String(e?.message || e || '')); }
  }
  return (
    <section className="card stack">
      <h2>{t('profile.app')}</h2>
      <p className="muted">{t('profile.version', { v: BUNDLE_VERSION.replace('+', ' · build ') })}</p>
      {isNative ? (
        <div className="row-flex">
          <button type="button" className="btn btn-ghost" onClick={cek} disabled={state === 'checking'}>{state === 'checking' ? <Spinner size={16} /> : <RefreshCw size={16} aria-hidden="true" />}{t('profile.checkUpdate')}</button>
          {state === 'latest' ? <span className="muted">{t('profile.upToDate')}</span> : state === 'error' ? <span className="err">{t('profile.updateFailed')}</span> : null}
        </div>
      ) : <div><Link className="btn btn-primary" to="/unduh"><Download size={16} aria-hidden="true" />{t('nav.download')}</Link></div>}
      {isNative && detail ? <p className="hint">{detail}</p> : null}
    </section>
  );
}

export default function Profile({ tab: tabAwal }) {
  const { t, lang } = useI18n();
  const { akun, logout } = useAuth();
  const [tab, setTab] = useState(tabAwal === 'laporan' ? 'aktivitas' : 'aktivitas');
  const me = useLoad(() => api.get('/auth/saya'), []);
  const teguran = akun?.jumlahTeguran || 0;
  const s = me.data?.statistik;
  const relawan = akun?.peran === 'Relawan';
  return (
    <div className="page">
      <section className="board profile-head">
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 24 }} aria-hidden="true">{akun.nama.charAt(0).toUpperCase()}</span>
        <div className="profile-who">
          <h1>{akun.nama}</h1>
          <p className="sub">{t(`role.${akun.peran}`)}{akun.namaKomunitas ? ` · ${akun.namaKomunitas}` : ''}{akun.instansi ? ` · ${akun.instansi}` : ''} · <span className="tag k-muted" style={{ height: 20, fontSize: 15 }}>{akun.kode}</span></p>
        </div>
        {relawan ? (
          <dl className="tally profile-tally">
            <div><dt>{t('lb.points')}</dt><dd>{fmtNum(akun.totalPoin, lang)}</dd></div>
            <div><dt>{t('profile.stats.reports')}</dt><dd>{s ? fmtNum(s.laporan, lang) : '·'}</dd></div>
            <div><dt>{t('profile.stats.cleanups')}</dt><dd>{s ? fmtNum(s.pembersihan, lang) : '·'}</dd></div>
            <div><dt>{t('profile.stats.kg')}</dt><dd>{s ? fmtNum(s.beratKg, lang) : '·'}</dd></div>
          </dl>
        ) : null}
        <button type="button" className="btn btn-ghost profile-out" onClick={logout}><LogOut size={16} aria-hidden="true" />{t('common.signout')}</button>
      </section>
      {teguran ? <div style={{ marginTop: 16 }}><Notice kind="warn"><FileWarning size={16} aria-hidden="true" /> {t('profile.warnings')}: {teguran}</Notice></div> : null}
      <div className="seg" role="tablist" style={{ margin: '20px 0 16px' }}>
        <button type="button" role="tab" aria-selected={tab === 'aktivitas'} aria-pressed={tab === 'aktivitas'} onClick={() => setTab('aktivitas')}>{t('profile.activity')}</button>
        <button type="button" role="tab" aria-selected={tab === 'atur'} aria-pressed={tab === 'atur'} onClick={() => setTab('atur')}>{t('profile.title')}</button>
        <button type="button" role="tab" aria-selected={tab === 'app'} aria-pressed={tab === 'app'} onClick={() => setTab('app')}>{t('profile.app')}</button>
      </div>
      {tab === 'aktivitas' ? (relawan ? <Activity /> : <div className="card"><Link to="/admin/log">{t('audit.title')}</Link></div>)
        : tab === 'atur' ? <Settings akun={akun} /> : <AppInfo />}
      {me.error ? <Notice kind="bad">{errText(t, me.error)}</Notice> : null}
      <p className="muted small" style={{ marginTop: 20 }}>{t('admin.joined')} {fmtDate(akun.dibuat, lang)}</p>
    </div>
  );
}
