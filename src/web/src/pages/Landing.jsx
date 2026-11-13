import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Map, RotateCcw, ShieldCheck, Smartphone } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api } from '../api/client.js';
import { onLive } from '../api/live.js';
import { LotTag, Mark } from '../components/ui.jsx';
import { fmtNum } from '../lib/platform.js';
import { LangSwitch } from './Download.jsx';

function useLive() {
  const [heat, setHeat] = useState(null);
  const [lb, setLb] = useState(null);
  useEffect(() => {
    const load = () => {
      api.get('/heatmap').then(setHeat).catch(() => {});
      api.get('/leaderboard/peringkat?limit=5').then(setLb).catch(() => {});
    };
    load();
    const a = onLive('heatmap', load); const b = onLive('leaderboard', load);
    return () => { a(); b(); };
  }, []);
  return { heat, lb };
}

function Nav() {
  const { t } = useI18n();
  const { akun } = useAuth();
  return (
    <header className="lnav">
      <div className="lwrap lnav-in">
        <Link to="/" className="brand"><img src="/logo.svg" alt="" width="32" height="32" /><span>SeaGuard</span></Link>
        <nav className="lnav-links" aria-label={t('a11y.site')}>
          <Link to="/peta">{t('nav.map')}</Link>
          <Link to="/leaderboard">{t('nav.leaderboard')}</Link>
          <LangSwitch />
          {akun ? <Link to={akun.peran === 'Relawan' ? '/peta' : '/verifikasi/laporan'}>{akun.nama.split(' ')[0]}</Link> : <Link to="/masuk">{t('land.signin')}</Link>}
          <Link className="btn btn-light btn-sm" to="/unduh"><Download size={16} aria-hidden="true" />{t('land.getApp')}</Link>
        </nav>
      </div>
    </header>
  );
}

/** The hero visual is the product itself: the live Hotspot Board, not a picture of it. */
function LiveBoard({ heat }) {
  const { t } = useI18n();
  const rows = heat?.papan.slice(0, 6) || [];
  return (
    <div className="appframe board" aria-label={t('land.live')}>
      <div className="appframe-head">
        <h2>{t('map.board')}</h2>
        <p className="sub">{t('map.boardSub')}</p>
      </div>
      <ol className="lots">
        {rows.length ? rows.map((p, i) => (
          <li key={p.idKlaster} className="deal" style={{ '--i': i }}>
            <Link className="lot" to={`/peta?titik=${p.kode}`}>
              <LotTag kode={p.kode} kat={p.kategoriKualitas} />
              <span style={{ minWidth: 0 }}>
                <b>{p.lokasiNama}</b>
                <small>{p.jumlahLaporan === 1 ? t('common.report1') : t('common.reports', { n: p.jumlahLaporan })} · {p.statusLaporan === 'Diklaim' ? t('status.Diklaim') : t('common.days', { n: Math.round(p.rataRataHari) })}</small>
              </span>
              <span className="heat">{Math.round(p.heatIntensity)}</span>
            </Link>
          </li>
        )) : [0, 1, 2, 3, 4].map((i) => <li key={i} className="lot" aria-hidden="true"><span className="skel" style={{ height: 24, opacity: 0.12, gridColumn: '1 / -1' }} /></li>)}
      </ol>
    </div>
  );
}

const STEPS = [
  ['land.step1', 'land.step1.b', 'Menunggu Verifikasi'],
  ['land.step2', 'land.step2.b', 'Disetujui'],
  ['land.step3', 'land.step3.b', 'Diklaim'],
  ['land.step4', 'land.step4.b', 'Dibersihkan'],
  ['land.step5', 'land.step5.b', 'Dibersihkan'],
];

/** The section's one moment: a lot tag walks the five steps once when the section comes into view. */
function Steps() {
  const { t } = useI18n();
  const ref = useRef(null);
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(-1);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun((r) => r || 1); io.disconnect(); } }, { threshold: 0.45 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!run) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setStep(4); return undefined; }
    setStep(0);
    const id = setInterval(() => setStep((s) => { if (s >= 4) { clearInterval(id); return 4; } return s + 1; }), 700);
    return () => clearInterval(id);
  }, [run]);
  return (
    <section className="lsec lsec-steps" ref={ref} aria-labelledby="h-how">
      <div className="lwrap">
        <div className="lhead">
          <h2 id="h-how">{t('land.how')}</h2>
          <p>{t('land.how.b')}</p>
        </div>
        <ol className="steps">
          {STEPS.map(([h, b, st], i) => (
            <li key={h} className={`step ${step >= i ? 'on' : ''} ${step === i ? 'now' : ''}`}>
              <span className="step-no">{i + 1}</span>
              <h3>{t(h)}</h3>
              <p>{t(b)}</p>
              <div className="step-lot">
                {step === i || (i === 4 && step === 4) ? (
                  i === 4 ? <span className="stencil step-pts">+71</span>
                    : <><LotTag kode="LP-0012" kat="Berbahaya" /><Mark status={st} /></>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRun((r) => r + 1)}><RotateCcw size={15} aria-hidden="true" />{t('land.replay')}</button>
      </div>
    </section>
  );
}

export default function Landing() {
  const { t, lang } = useI18n();
  const { heat, lb } = useLive();
  const [versi, setVersi] = useState(null);
  useEffect(() => { api.get('/app/versi').then((v) => setVersi(v.native)).catch(() => {}); }, []);
  const r = heat?.ringkasan;

  return (
    <div className="landing">
      <Nav />
      <main>
        <section className="lsec lhero deep" aria-labelledby="h1">
          <div className="lwrap lhero-in">
            <div className="lhero-copy enter">
              <h1 id="h1">{t('land.h1')}</h1>
              <p className="lead">{t('land.lead')}</p>
              <div className="lhero-cta">
                <Link className="btn btn-light btn-lg" to="/unduh"><Download size={18} aria-hidden="true" />{t('land.getApp')}</Link>
                <Link className="btn btn-ghost btn-lg" to="/peta"><Map size={18} aria-hidden="true" />{t('land.openMap')}</Link>
              </div>
              <p className="lhero-fact"><ShieldCheck size={18} aria-hidden="true" />{t('land.fact')}</p>
            </div>
            <LiveBoard heat={heat} />
          </div>
        </section>

        <Steps />

        <section className="lsec lsec-why deep" aria-labelledby="h-why">
          <div className="lwrap lwhy">
            <p className="lwhy-num stencil" aria-hidden="true">201–552</p>
            <div className="lwhy-copy">
              <h2 id="h-why">{t('land.why.h')}</h2>
              <p>{t('land.why.b')}</p>
              <p className="lsrc">{t('land.why.src')}</p>
            </div>
          </div>
        </section>

        <section className="lsec lsec-board" aria-labelledby="h-board">
          <div className="lwrap lboard">
            <div className="lhead">
              <h2 id="h-board">{t('land.board.h')}</h2>
              <p>{t('land.board.b')}</p>
              {r ? (
                <dl className="lstats">
                  <div><dt>{t('land.stat.active')}</dt><dd className="stencil">{fmtNum(r.aktif, lang)}</dd></div>
                  <div><dt>{t('land.stat.cleaned')}</dt><dd className="stencil">{fmtNum(r.dibersihkan, lang)}</dd></div>
                  <div><dt>{t('land.stat.volunteers')}</dt><dd className="stencil">{fmtNum(r.relawan, lang)}</dd></div>
                </dl>
              ) : null}
              <Link className="btn btn-primary" to="/leaderboard">{t('land.seeBoard')}</Link>
            </div>
            <ol className="lrank card">
              {(lb?.daftar || []).map((x) => (
                <li key={x.idRelawan}>
                  <span className={`rankno ${x.peringkat <= 3 ? 'top' : ''}`}>{x.peringkat}</span>
                  <span><b>{x.nama}</b><small>{x.namaKomunitas || ''}</small></span>
                  <span className="stencil pts">{fmtNum(x.totalPoin, lang)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lsec lsec-app" aria-labelledby="h-app">
          <div className="lwrap lapp">
            <div className="phone board" aria-hidden="true">
              <div className="phone-notch" />
              <div className="phone-top"><img src="/logo.svg" alt="" width="22" height="22" /><b>SeaGuard</b></div>
              <ol className="lots">
                {(heat?.papan || []).slice(0, 5).map((p) => (
                  <li key={p.idKlaster} className="lot"><LotTag kode={p.kode} kat={p.kategoriKualitas} /><span><b>{p.lokasiNama}</b></span><span className="heat">{Math.round(p.heatIntensity)}</span></li>
                ))}
              </ol>
              <div className="phone-tabs"><Map size={18} /><Smartphone size={18} /><Download size={18} /></div>
            </div>
            <div className="lhead">
              <h2 id="h-app">{t('land.app.title')}</h2>
              <p>{t('land.app.b')}</p>
              <p className="muted small">{t('land.app.req')}{versi ? ` · ${t('dl.size', { v: versi.versionName })}` : ''}</p>
              <Link className="btn btn-light btn-lg" to="/unduh"><Download size={18} aria-hidden="true" />{t('land.getApp')}</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="lfoot deep">
        <div className="lwrap lfoot-in">
          <Link to="/" className="brand"><img src="/logo.svg" alt="" width="28" height="28" /><span>SeaGuard</span></Link>
          <p>{t('land.footer')}</p>
          <p className="small">Map data © OpenStreetMap contributors, tiles by OpenFreeMap. {t('land.why.src')}</p>
        </div>
      </footer>
    </div>
  );
}
