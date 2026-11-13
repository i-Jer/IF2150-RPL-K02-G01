import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download as DownloadIcon, ArrowLeft, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';
import { useI18n } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { isNative } from '../lib/platform.js';

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <button type="button" className="langswitch" onClick={() => setLang(lang === 'en' ? 'id' : 'en')} aria-label={lang === 'en' ? 'Ganti ke Bahasa Indonesia' : 'Switch to English'}>
      <span className={lang === 'en' ? 'on' : ''}>EN</span><span className={lang === 'id' ? 'on' : ''}>ID</span>
    </button>
  );
}

export default function Download() {
  const { t } = useI18n();
  const [v, setV] = useState(null);
  const [state, setState] = useState('loading');
  const qr = useRef(null);
  const url = `${window.location.origin}/download/android`;

  useEffect(() => {
    api.get('/app/versi').then((r) => { setV(r.native); setState(r.native ? 'ok' : 'none'); }).catch(() => setState('none'));
  }, []);
  useEffect(() => {
    if (qr.current) QRCode.toCanvas(qr.current, url, { width: 168, margin: 1, color: { dark: '#0b3c5d', light: '#ffffff' } }).catch(() => {});
  }, [url, state]);

  return (
    <div className="dl deep">
      <header className="lwrap dl-top">
        <Link to="/" className="brand"><img src="/logo.svg" alt="" width="32" height="32" /><span>SeaGuard</span></Link>
        <LangSwitch />
      </header>
      <main className="lwrap dl-in">
        <div className="dl-copy">
          <h1>{t('dl.title')}</h1>
          <p className="lead">{t('dl.body')}</p>
          {isNative ? null : (
            <div className="dl-cta">
              <a className={`btn btn-light btn-lg ${state !== 'ok' ? 'disabled' : ''}`} href={state === 'ok' ? '/download/android' : undefined} aria-disabled={state !== 'ok'} download>
                <DownloadIcon size={18} aria-hidden="true" />{t('land.getApp')}
              </a>
              <span className="sub">{v ? `${t('dl.size', { v: v.versionName })} · ${t('land.app.req')}` : state === 'none' ? t('dl.none') : '…'}</span>
            </div>
          )}
          <h2 className="dl-h">{t('dl.steps')}</h2>
          <ol className="dl-steps">
            <li><span className="stencil">1</span>{t('dl.s1')}</li>
            <li><span className="stencil">2</span>{t('dl.s2')}</li>
            <li><span className="stencil">3</span>{t('dl.s3')}</li>
          </ol>
          <p className="dl-note"><RefreshCw size={16} aria-hidden="true" />{t('land.app.b')}</p>
          <Link className="dl-web" to="/peta"><ArrowLeft size={16} aria-hidden="true" />{t('dl.web')}</Link>
        </div>
        <div className="dl-qr">
          <canvas ref={qr} aria-label={t('a11y.qr')} role="img" />
          <span className="sub">{url.replace(/^https?:\/\//, '')}</span>
        </div>
      </main>
    </div>
  );
}
