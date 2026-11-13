import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api } from '../api/client.js';
import { LotTag, Notice, Spinner } from '../components/ui.jsx';
import { Field, FormSummary, PasswordRules, passwordValid, useFormErrors } from '../components/Field.jsx';

function AuthFrame({ children }) {
  const { t } = useI18n();
  const [lots, setLots] = useState([]);
  useEffect(() => { api.get('/heatmap').then((r) => setLots(r.papan.slice(0, 4))).catch(() => {}); }, []);
  return (
    <div className="auth">
      <aside className="auth-side deep">
        <Link to="/" className="brand"><img src="/logo.svg" alt="" width="34" height="34" /><span>SeaGuard</span></Link>
        <div className="auth-board" aria-hidden={!lots.length}>
          <h2>{t('map.board')}</h2>
          <p className="sub">{t('map.boardSub')}</p>
          <div style={{ marginTop: 14 }}>
            {lots.map((l) => (
              <div key={l.idKlaster} className="lot" style={{ cursor: 'default' }}>
                <LotTag kode={l.kode} kat={l.kategoriKualitas} />
                <div><b>{l.lokasiNama}</b><small>{l.jumlahLaporan === 1 ? t('common.report1') : t('common.reports', { n: l.jumlahLaporan })}</small></div>
                <span className="heat">{Math.round(l.heatIntensity)}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="auth-main">{children}</main>
    </div>
  );
}

function PwInput({ value, onChange, id, autoComplete, invalid, describedBy }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} required aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ paddingRight: 48 }} />
      <button type="button" className="iconbtn" onClick={() => setShow((s) => !s)} aria-label={show ? t('a11y.pwHide') : t('a11y.pwShow')}
        style={{ position: 'absolute', right: 2, top: 1, color: 'var(--mute)' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  );
}

function tujuanAwal(akun, ke) {
  if (ke && ke.startsWith('/')) return ke;
  return akun?.peran === 'Relawan' ? '/peta' : '/verifikasi/laporan';
}

export function Login() {
  const { t } = useI18n();
  const { login, akun } = useAuth();
  const nav = useNavigate();
  const [q] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [kosong, setKosong] = useState({});

  useEffect(() => { if (akun) nav(tujuanAwal(akun, q.get('ke')), { replace: true }); }, [akun, nav, q]);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    const k = { email: !email.trim() ? t('e.EMAIL_EMPTY') : '', pw: !password ? t('e.PASSWORD_EMPTY') : '' };
    setKosong(k);
    if (k.email || k.pw) { document.getElementById(k.email ? 'email' : 'pw')?.focus(); return; }
    setBusy(true);
    try { await login(email.trim(), password); } catch (x) { setErr(x); } finally { setBusy(false); }
  }
  const isi = (em, pw) => { setEmail(em); setPassword(pw); };

  return (
    <AuthFrame>
      <form className="auth-form stack" onSubmit={submit} noValidate>
        <div>
          <h1>{t('auth.signin.title')}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{t('auth.signin.body')}</p>
        </div>
        <Field id="email" label={t('auth.email')} error={kosong.email}>
          <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setKosong((k) => ({ ...k, email: '' })); }} required />
        </Field>
        <Field id="pw" label={t('auth.password')} error={kosong.pw}>
          <PwInput id="pw" value={password} onChange={(v) => { setPassword(v); setKosong((k) => ({ ...k, pw: '' })); }} autoComplete="current-password" invalid={!!err || !!kosong.pw} describedBy={kosong.pw ? 'pw-err' : undefined} />
        </Field>
        {err ? (
          <Notice kind="bad">
            {errText(t, err)}
            {err.code === 'LOGIN_FAILED' && err.details?.sisa ? <div className="small" style={{ marginTop: 4 }}>{t('auth.attemptsLeft', { n: err.details.sisa })}</div> : null}
          </Notice>
        ) : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : null}{t('auth.signin.go')}</button>
        <p className="muted">{t('auth.noAccount')} <Link to="/daftar">{t('auth.signup.go')}</Link></p>
        <details className="demo">
          <summary>{t('auth.demo')}</summary>
          <div className="stack-sm" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => isi('relawan1@seaguard.test', 'Relawan123!')}>{t('role.Relawan')}: relawan1@seaguard.test</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => isi('relawan2@seaguard.test', 'Relawan123!')}>{t('role.Relawan')}: relawan2@seaguard.test</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => isi('verifikator@seaguard.test', 'Verifikator123!')}>{t('role.Verifikator')}: verifikator@seaguard.test</button>
          </div>
        </details>
      </form>
    </AuthFrame>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REG_IDS = { nama: 'nama', email: 'email', password: 'pw', komunitas: 'kom' };

export function Register() {
  const { t, lang } = useI18n();
  const { daftar, akun } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ nama: '', email: '', password: '', idKomunitas: '' });
  const [kom, setKom] = useState([]);
  const [busy, setBusy] = useState(false);
  const fe = useFormErrors(REG_IDS);
  useEffect(() => { api.get('/komunitas').then(setKom).catch(() => {}); }, []);
  useEffect(() => { if (akun) nav('/peta', { replace: true }); }, [akun, nav]);
  const set = (k, field) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); fe.hapus(field); };
  const labels = { nama: t('auth.name'), email: t('auth.email'), password: t('auth.password'), komunitas: t('auth.community') };

  /** Check what can be checked here first, so every problem is shown at once, under its own field. */
  function periksa() {
    const e = {};
    if (f.nama.trim().length < 2 || f.nama.trim().length > 80) e.nama = t('e.NAME_INVALID');
    if (!EMAIL_RE.test(f.email.trim())) e.email = t('e.EMAIL_INVALID');
    if (!passwordValid(f.password)) e.password = t('e.PASSWORD_WEAK');
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    fe.reset();
    const salah = periksa();
    if (Object.keys(salah).length) {
      for (const [k, v] of Object.entries(salah)) fe.setField(k, v);
      document.getElementById(REG_IDS[Object.keys(salah)[0]])?.focus();
      return;
    }
    setBusy(true);
    try { await daftar({ ...f, nama: f.nama.trim(), email: f.email.trim(), idKomunitas: f.idKomunitas || null, bahasa: lang }); } catch (x) { fe.tangkap(x); } finally { setBusy(false); }
  }

  return (
    <AuthFrame>
      <form className="auth-form stack" onSubmit={submit} noValidate>
        <div>
          <h1>{t('auth.signup.title')}</h1>
          <p className="muted" style={{ marginTop: 8 }}>{t('auth.signup.body')}</p>
        </div>
        <Field id="nama" label={t('auth.name')} error={fe.errs.nama}>
          <input id="nama" className="input" autoComplete="name" value={f.nama} onChange={set('nama', 'nama')} required />
        </Field>
        <Field id="email" label={t('auth.email')} error={fe.errs.email}>
          <input id="email" className="input" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email', 'email')} required />
        </Field>
        <Field id="pw" label={t('auth.password')} error={fe.errs.password}>
          <PwInput id="pw" value={f.password} onChange={(v) => { setF((x) => ({ ...x, password: v })); fe.hapus('password'); }} autoComplete="new-password"
            invalid={!!fe.errs.password} describedBy={['pw-rules', fe.errs.password ? 'pw-err' : null].filter(Boolean).join(' ')} />
          <PasswordRules id="pw-rules" value={f.password} />
        </Field>
        <Field id="kom" label={t('auth.community')} optional error={fe.errs.komunitas}>
          <select id="kom" className="select" value={f.idKomunitas} onChange={set('idKomunitas', 'komunitas')}>
            <option value="">{t('common.none')}</option>
            {kom.map((k) => <option key={k.idKomunitas} value={k.idKomunitas}>{k.namaKomunitas}</option>)}
          </select>
        </Field>
        <FormSummary errs={fe.errs} labels={labels} ids={REG_IDS} />
        {fe.umum ? <Notice kind="bad">{errText(t, fe.umum)}</Notice> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? <Spinner /> : null}{t('auth.signup.go')}</button>
        <p className="small muted">{t('auth.consentNote')}</p>
        <p className="muted">{t('auth.haveAccount')} <Link to="/masuk">{t('auth.signin.go')}</Link></p>
      </form>
    </AuthFrame>
  );
}
