import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, ImageDown, Send, CheckCircle2 } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { PhotoDrop } from '../components/PhotoDrop.jsx';
import { ConsentDialog } from '../components/Consent.jsx';
import { LotTag, Notice, Spinner } from '../components/ui.jsx';
import { Field, FieldError, FormSummary, useFormErrors } from '../components/Field.jsx';
import { ambilKoordinatGPS } from '../lib/device.js';
import { isNative } from '../lib/platform.js';

const KAT = ['Sehat', 'Waspada', 'Berbahaya'];

const REPORT_IDS = { foto: 'f-foto', tingkat: 'f-tingkat', koordinat: 'lat', deskripsi: 'desk' };

export default function Report() {
  const { t } = useI18n();
  const [form, setForm] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fotoErr, setFotoErr] = useState('');
  const [ind, setInd] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [sumber, setSumber] = useState('manual');
  const [jenis, setJenis] = useState([]);
  const [vol, setVol] = useState('');
  const [tempat, setTempat] = useState('');
  const [desk, setDesk] = useState('');
  const [consent, setConsent] = useState(null); // null unknown | 'ask' | true | false
  const [pending, setPending] = useState(null);
  const [locating, setLocating] = useState(false);
  const [gpsErr, setGpsErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const fe = useFormErrors(REPORT_IDS);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api.get('/pelaporan/form').then((f) => {
      setForm(f);
      setConsent(f.consent ? f.consent.keputusan === 'Izinkan' : null);
    }).catch(() => setForm({ jenisSampah: ['plastik', 'styrofoam', 'jaring', 'logam', 'kaca', 'kayu', 'organik', 'limbah_b3', 'lainnya'], volume: ['kecil', 'sedang', 'besar', 'sangat_besar'] }));
  }, []);

  /** KF05: the first time camera or location is needed, ask (and record) consent. */
  const denganConsent = (fn) => {
    if (consent === true) return fn();
    setPending(() => fn);
    setConsent('ask');
    return undefined;
  };

  async function gps() {
    setLocating(true); setGpsErr('');
    try {
      const g = await ambilKoordinatGPS();
      setLat(String(g.lat)); setLon(String(g.lon)); setSumber('perangkat');
    } catch (e) {
      setGpsErr(t(e.code === 'GEO_DENIED' && isNative ? 'e.GEO_DENIED_APP' : String(e.code || '').startsWith('GEO_') ? `e.${e.code}` : 'e.GEO_UNAVAILABLE'));
    } finally { setLocating(false); }
  }

  function onFoto(f) {
    setFotoErr(''); setFoto(f); fe.hapus('foto');
    if (f?.exif?.lat != null && !lat) { setLat(String(f.exif.lat)); setLon(String(f.exif.lon)); setSumber('exif'); }
  }

  async function kirim(e) {
    e.preventDefault();
    fe.reset();
    // Check everything at once so each problem shows under its own field.
    const salah = {};
    if (!foto) salah.foto = t('e.PHOTO_MISSING');
    if (!ind) salah.tingkat = t('e.INDICATOR_INVALID');
    const la = Number(lat); const lo = Number(lon);
    if (lat === '' || lon === '') salah.koordinat = t('e.COORD_REQUIRED');
    else if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) salah.koordinat = t('e.COORD_INVALID');
    if (Object.keys(salah).length) {
      for (const [k, v] of Object.entries(salah)) fe.setField(k, v);
      const first = REPORT_IDS[Object.keys(salah)[0]];
      const el = document.getElementById(first); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true });
      return;
    }
    const fd = new FormData();
    fd.append('foto', foto.file, foto.file.name || 'foto.jpg');
    fd.append('indikatorTingkat', ind);
    fd.append('lat', lat); fd.append('lon', lon); fd.append('sumberKoordinat', sumber);
    fd.append('jenisSampah', jenis.join(','));
    if (vol) fd.append('perkiraanVolume', vol);
    if (tempat.trim()) fd.append('lokasiNama', tempat.trim());
    if (desk.trim()) fd.append('deskripsi', desk.trim());
    if (foto.dikompres && foto.exif) fd.append('exifKlien', JSON.stringify(foto.exif));
    setBusy(true); setRetry(0);
    try {
      setDone(await api.upload('/pelaporan', fd, { onRetry: setRetry }));
    } catch (x) { fe.tangkap(x); } finally { setBusy(false); }
  }

  function reset() {
    setDone(null); setFoto(null); setInd(''); setLat(''); setLon(''); setJenis([]); setVol(''); setTempat(''); setDesk(''); setSumber('manual');
  }

  if (done) {
    return (
      <div className="page narrow">
        <div className="card done-card">
          <CheckCircle2 size={40} color="var(--sehat-ink)" aria-hidden="true" />
          <h1>{t('report.sent.title')}</h1>
          <LotTag kode={done.kode} kat={ind} size="lg" />
          <p className="muted">{t('report.sent.body', { k: done.kode })}</p>
          <div className="row-flex">
            <button type="button" className="btn btn-primary" onClick={reset}>{t('report.another')}</button>
            <Link className="btn btn-ghost" to="/laporan-saya">{t('report.mine')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>{t('report.title')}</h1>
          <p>{t('report.body')}</p>
        </div>
      </div>
      <form className="card stack" onSubmit={kirim} noValidate>
        <div id="f-foto" tabIndex={-1} className={`report-photo ${fe.errs.foto ? 'group-err' : ''}`} onClickCapture={(e) => { if (consent !== true && consent !== false) { e.preventDefault(); e.stopPropagation(); denganConsent(() => document.querySelector('.report-photo input[type=file]')?.click()); } }}>
          <PhotoDrop label={t('report.photo')} value={foto} onChange={onFoto} onError={setFotoErr} />
        </div>
        <FieldError id="f-foto-err" error={fe.errs.foto} />
        {fotoErr ? <Notice kind="bad">{fotoErr}</Notice> : foto ? <Notice kind="ok">{t('report.photo.ok')}{foto.dikompres ? ` ${t('report.compressed')}` : ''}</Notice> : null}

        <fieldset className={`field ${fe.errs.tingkat ? 'has-err' : ''}`}>
          <legend className="label">{t('report.level')}</legend>
          <div className="levels" role="radiogroup" id="f-tingkat" tabIndex={-1} aria-describedby={fe.errs.tingkat ? 'f-tingkat-err' : undefined}>
            {KAT.map((k) => (
              <label key={k} className={`level l-${k} ${ind === k ? 'on' : ''}`}>
                <input type="radio" name="ind" value={k} checked={ind === k} onChange={() => { setInd(k); fe.hapus('tingkat'); }} />
                <i aria-hidden="true" />
                <span><b>{t(`kat.${k}`)}</b><small>{t(`kat.${k}.desc`)}</small></span>
              </label>
            ))}
          </div>
          <FieldError id="f-tingkat-err" error={fe.errs.tingkat} />
        </fieldset>

        <fieldset className={`field ${fe.errs.koordinat ? 'has-err' : ''}`}>
          <legend className="label">{t('report.location')}</legend>
          <div className="coord-row">
            <div className="field"><label htmlFor="lat" className="hint">{t('report.lat')}</label>
              <input id="lat" className="input" inputMode="decimal" value={lat} aria-invalid={fe.errs.koordinat ? true : undefined} aria-describedby={fe.errs.koordinat ? 'f-koordinat-err' : undefined} onChange={(e) => { setLat(e.target.value); setSumber('manual'); fe.hapus('koordinat'); }} placeholder="-6.8915" /></div>
            <div className="field"><label htmlFor="lon" className="hint">{t('report.lon')}</label>
              <input id="lon" className="input" inputMode="decimal" value={lon} aria-invalid={fe.errs.koordinat ? true : undefined} aria-describedby={fe.errs.koordinat ? 'f-koordinat-err' : undefined} onChange={(e) => { setLon(e.target.value); setSumber('manual'); fe.hapus('koordinat'); }} placeholder="107.6107" /></div>
          </div>
          <div className="row-flex">
            <button type="button" className="btn btn-ghost" onClick={() => denganConsent(gps)} disabled={locating}>
              {locating ? <Spinner size={16} /> : <Crosshair size={17} aria-hidden="true" />}{locating ? t('report.locating') : t('report.useGps')}
            </button>
            {foto?.exif?.lat != null ? (
              <button type="button" className="btn btn-ghost" onClick={() => { setLat(String(foto.exif.lat)); setLon(String(foto.exif.lon)); setSumber('exif'); }}>
                <ImageDown size={17} aria-hidden="true" />{t('report.useExif')}
              </button>
            ) : null}
          </div>
          <FieldError id="f-koordinat-err" error={fe.errs.koordinat} />
          {gpsErr ? <FieldError id="f-gps-err" error={gpsErr} /> : null}
        </fieldset>

        <Field id="tempat" label={t('report.place')} optional>
          <input id="tempat" className="input" value={tempat} onChange={(e) => setTempat(e.target.value)} maxLength={160} />
        </Field>

        <fieldset className="field">
          <legend className="label">{t('report.waste')}<span className="opt"> · {t('common.optional')}</span></legend>
          <div className="chips">
            {(form?.jenisSampah || []).map((j) => (
              <button key={j} type="button" className="chip" aria-pressed={jenis.includes(j)}
                onClick={() => setJenis((x) => (x.includes(j) ? x.filter((y) => y !== j) : [...x, j]))}>{t(`jenis.${j}`)}</button>
            ))}
          </div>
        </fieldset>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="vol">{t('report.volume')}<span className="opt"> · {t('common.optional')}</span></label>
            <select id="vol" className="select" value={vol} onChange={(e) => setVol(e.target.value)}>
              <option value="">{t('report.volume.none')}</option>
              {(form?.volume || []).map((v) => <option key={v} value={v}>{t(`vol.${v}`)}</option>)}
            </select>
          </div>
        </div>

        <Field id="desk" label={t('report.desc')} optional error={fe.errs.deskripsi} hint={t('form.charsLeft', { n: 1000 - desk.length })}>
          <textarea id="desk" className="textarea" value={desk} onChange={(e) => { setDesk(e.target.value); fe.hapus('deskripsi'); }} maxLength={1000} placeholder={t('report.desc.ph')} />
        </Field>

        <FormSummary errs={fe.errs} ids={REPORT_IDS} labels={{ foto: t('report.photo'), tingkat: t('report.level'), koordinat: t('report.location'), deskripsi: t('report.desc') }} />
        {fe.umum ? <Notice kind="bad">{errText(t, fe.umum)}</Notice> : null}
        {busy && retry > 1 ? <Notice kind="warn">{t('report.retrying', { n: retry })}</Notice> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? <Spinner /> : <Send size={18} aria-hidden="true" />}{busy ? t('report.sending') : t('report.send')}
        </button>
      </form>
      {consent === 'ask' ? (
        <ConsentDialog onDone={(ok) => {
          setConsent(ok);
          const fn = pending; setPending(null);
          if (ok && fn) setTimeout(fn, 50);
        }} />
      ) : null}
    </div>
  );
}
