import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Recycle, Send, CheckCircle2, MapPinned, Clock } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { PhotoDrop } from '../components/PhotoDrop.jsx';
import { ConsentDialog } from '../components/Consent.jsx';
import { Dialog, Empty, Kat, LotTag, Mark, Notice, Spinner, useToast } from '../components/ui.jsx';
import { Field, FieldError, FormSummary, useFormErrors } from '../components/Field.jsx';
import { ambilKoordinatGPS } from '../lib/device.js';
import { fmtCoord, fmtDate, fmtJarak, isNative } from '../lib/platform.js';

/** Each photo carries its own coordinates: EXIF GPS first, otherwise the phone's GPS at the moment it was added. */
async function koordinatUntuk(foto) {
  if (foto?.exif?.lat != null) return { lat: foto.exif.lat, lon: foto.exif.lon, sumber: 'exif' };
  const g = await ambilKoordinatGPS();
  return { lat: g.lat, lon: g.lon, sumber: 'perangkat' };
}

/** The claim's 7-day hold drawn as a track that drains as the days pass (a claim expires after 7 days). */
function ClaimTrack({ batas }) {
  const { t } = useI18n();
  const end = new Date(batas).getTime();
  const total = 7 * 86400000;
  const left = Math.max(0, Math.min(total, end - Date.now()));
  const n = Math.ceil(left / 86400000);
  return (
    <div className="track-wrap">
      <div className="track" role="meter" aria-valuemin={0} aria-valuemax={7} aria-valuenow={n} aria-label={t('cleanup.daysLeft', { n })}>
        <i style={{ '--p': left / total }} />
      </div>
      <small>{t('cleanup.daysLeft', { n })}</small>
    </div>
  );
}

/**
 * Both photo positions on one 0-150 m scale with the 100 m geofence marked (+10 m tolerance).
 * A photo further than the scale sits at its end with an arrow; labels anchor inside the box so long
 * distances (e.g. 113 km) never run past its edge.
 */
function GeoTrack({ a, b }) {
  const { t, lang } = useI18n();
  const max = 150;
  const frac = (m) => Math.min(1, Math.max(0, m) / max);
  const pin = (m, label, low) => {
    if (m == null) return null;
    const f = frac(m);
    const sisi = f > 0.7 ? 'end' : f < 0.2 ? 'start' : 'mid';
    return (
      <span className={`geo-pin ${low ? 'low' : ''} ${m > 110 ? 'bad' : ''} ${m > max ? 'over' : ''}`} style={{ left: `${f * 100}%` }}>
        <small className={`at-${sisi}`}>{label} · {m > max ? '> ' : ''}{fmtJarak(m, lang)}</small>
      </span>
    );
  };
  const batas = `${frac(100) * 100}%`;
  return (
    <div className="geo">
      <span className="geo-label">{t('cleanup.geo.scale')}</span>
      <div className="geo-scale">
        <span className="geo-ok" style={{ width: batas }} />
        <span className="geo-limit" style={{ left: batas }}><small>{t('cleanup.geo.limit')}</small></span>
        {pin(a, t('cleanup.before'), false)}
        {pin(b, t('cleanup.after'), true)}
      </div>
    </div>
  );
}

const CLEAN_IDS = { foto: 'c-foto', deskripsi: 'desk', peserta: 'orang', berat: 'kg' };

export default function Cleanup() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [gB, setGB] = useState(null);
  const [gA, setGA] = useState(null);
  const [geo, setGeo] = useState(null);
  const [desk, setDesk] = useState('');
  const [orang, setOrang] = useState('1');
  const [kg, setKg] = useState('');
  const [fotoErr, setFotoErr] = useState('');
  const [consent, setConsent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const fe = useFormErrors(CLEAN_IDS);
  const setErr = (e) => (e ? fe.tangkap(e) : fe.reset());
  const [done, setDone] = useState(null);
  const [lepas, setLepas] = useState(false);

  const load = useCallback(async () => {
    setLoadErr(null);
    try {
      setForm(await api.get('/pembersihan/form'));
      const f = await api.get('/pelaporan/form').catch(() => null);
      if (f?.consent) setConsent(f.consent.keputusan === 'Izinkan');
    } catch (e) { setLoadErr(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setFoto(which, f) {
    setFotoErr(''); fe.hapus('foto'); setGeo(null);
    (which === 'b' ? setBefore : setAfter)(f);
    if (!f) { (which === 'b' ? setGB : setGA)(null); return; }
    try {
      const c = await koordinatUntuk(f);
      (which === 'b' ? setGB : setGA)(c);
    } catch (e) {
      (which === 'b' ? setGB : setGA)(null);
      // The photo had no GPS in it and the device could not give a position: say which, so it can be fixed.
      setFotoErr(String(e?.code || '').startsWith('GEO_') ? `${t('e.GPS_MISSING')} ${t(e.code === 'GEO_DENIED' && isNative ? 'e.GEO_DENIED_APP' : `e.${e.code}`)}` : t('e.GPS_MISSING'));
    }
  }

  // Live geofence preview (validasiBukti) once both coordinates are known.
  useEffect(() => {
    if (!gB || !gA || !form?.klaim) return;
    api.post('/pembersihan/validasi', { latBefore: gB.lat, lonBefore: gB.lon, latAfter: gA.lat, lonAfter: gA.lon })
      .then(setGeo).catch((e) => setErr(e));
  }, [gB, gA, form]);

  async function kirim(e) {
    e.preventDefault();
    fe.reset();
    // Everything that can be checked here is checked at once, each problem under its own field.
    const salah = {};
    if (!before || !after) salah.foto = t('e.PHOTO_MISSING_BA');
    else if (!gB || !gA) salah.foto = t('e.GPS_MISSING');
    else if (geo && !geo.valid) salah.foto = t('cleanup.geo.bad', { a: fmtJarak(geo.jarakBefore, lang), b: fmtJarak(geo.jarakAfter, lang) });
    if (desk.trim().length < 10) salah.deskripsi = t('e.CLEANUP_DESC_SHORT');
    const n = Number(orang || 1);
    if (!Number.isInteger(n) || n < 1 || n > 500) salah.peserta = t('e.PARTICIPANTS_INVALID');
    if (kg !== '' && (!Number.isFinite(Number(kg)) || Number(kg) < 0 || Number(kg) > 100000)) salah.berat = t('e.WEIGHT_INVALID');
    if (Object.keys(salah).length) {
      for (const [k2, v] of Object.entries(salah)) fe.setField(k2, v);
      const el = document.getElementById(CLEAN_IDS[Object.keys(salah)[0]]); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true });
      return;
    }
    const fd = new FormData();
    fd.append('fotoSebelum', before.file, before.file.name || 'sebelum.jpg');
    fd.append('fotoSesudah', after.file, after.file.name || 'sesudah.jpg');
    fd.append('latBefore', gB.lat); fd.append('lonBefore', gB.lon);
    fd.append('latAfter', gA.lat); fd.append('lonAfter', gA.lon);
    if (before.dikompres && before.exif) fd.append('exifBefore', JSON.stringify(before.exif));
    if (after.dikompres && after.exif) fd.append('exifAfter', JSON.stringify(after.exif));
    fd.append('deskripsiKegiatan', desk.trim());
    fd.append('jumlahPeserta', orang || '1');
    if (kg) fd.append('perkiraanBeratKg', kg);
    setBusy(true); setRetry(0);
    try { setDone(await api.upload('/pembersihan', fd, { onRetry: setRetry })); }
    catch (x) { fe.tangkap(x); if (x.details?.jarakBefore != null) setGeo({ valid: false, jarakBefore: x.details.jarakBefore, jarakAfter: x.details.jarakAfter }); }
    finally { setBusy(false); }
  }

  async function lepasKlaim() {
    try { await api.post('/klaim/batal', {}); toast({ title: t('klaim.Dibatalkan'), kind: 'ok' }); setLepas(false); load(); }
    catch (e) { toast({ title: errText(t, e), kind: 'bad' }); setLepas(false); }
  }

  if (loadErr) return <div className="page narrow"><Notice kind="bad">{errText(t, loadErr)}</Notice><button type="button" className="btn btn-ghost" style={{ marginTop: 12 }} onClick={load}>{t('common.retry')}</button></div>;
  if (!form) return <div className="page narrow"><div className="skel" style={{ height: 320 }} /></div>;

  if (done) {
    return (
      <div className="page narrow">
        <div className="card done-card">
          <CheckCircle2 size={40} color="var(--sehat-ink)" aria-hidden="true" />
          <h1>{t('cleanup.sent.title')}</h1>
          <LotTag kode={done.kode} size="lg" />
          <p className="muted">{t('cleanup.sent.body', { k: done.kode })}</p>
          <Link className="btn btn-primary" to="/peta">{t('nav.map')}</Link>
        </div>
      </div>
    );
  }

  const k = form.klaim;
  if (!k) {
    return (
      <div className="page narrow">
        <div className="page-head"><div><h1>{t('cleanup.title')}</h1><p>{t('cleanup.body')}</p></div></div>
        <div className="card"><Empty icon={MapPinned} title={t('cleanup.none.title')} action={<Link className="btn btn-primary" to="/peta">{t('cleanup.none.go')}</Link>}>{t('cleanup.none.body')}</Empty></div>
      </div>
    );
  }

  const header = (
    <div className="claimbar">
      <span className="stack-sm" style={{ gap: 4 }}><LotTag kode={k.kode} /><b>{k.lokasiNama || k.kodeLaporan}</b><small>{fmtCoord(k.lat, k.lon)} <Kat k={k.indikatorTingkat} /></small></span>
      <span className="claimbar-r"><Mark status={k.statusKlaim} prefix="klaim" /><small><Clock size={13} aria-hidden="true" /> {t('cleanup.deadline', { d: fmtDate(k.batasWaktu, lang) })}</small>{k.statusKlaim === 'Aktif' ? <button type="button" className="btn btn-danger btn-sm" onClick={() => setLepas(true)}>{t('cleanup.release')}</button> : null}</span>
      {k.statusKlaim === 'Aktif' ? <ClaimTrack batas={k.batasWaktu} /> : null}
    </div>
  );

  if (k.statusKlaim !== 'Aktif') {
    return (
      <div className="page narrow">
        <div className="page-head"><div><h1>{t('cleanup.title')}</h1></div></div>
        <div className="card stack">{header}<Notice kind="info">{t('cleanup.waiting')}</Notice></div>
      </div>
    );
  }

  const geoMsg = geo
    ? <div className="stack-sm"><GeoTrack a={geo.jarakBefore} b={geo.jarakAfter} />{geo.valid
      ? <Notice kind="ok">{t('cleanup.geo.ok', { r: 100, a: fmtJarak(geo.jarakBefore, lang), b: fmtJarak(geo.jarakAfter, lang) })}</Notice>
      : <Notice kind="bad">{t('cleanup.geo.bad', { a: fmtJarak(geo.jarakBefore, lang), b: fmtJarak(geo.jarakAfter, lang) })}</Notice>}</div>
    : <p className="hint">{t('cleanup.geo.wait')}</p>;

  const fotoBox = (which, val, setVal, g) => (
    <div className="stack-sm"
      onClickCapture={(e) => { if (consent !== true && consent !== false) { e.preventDefault(); e.stopPropagation(); setConsent({ ask: which }); } }}>
      <div className={`photo-${which}`}><PhotoDrop label={which === 'b' ? t('cleanup.before') : t('cleanup.after')} value={val} onChange={(f) => setVal(which, f)} onError={setFotoErr} /></div>
      {g ? <span className="pill dark">{g.sumber === 'exif' ? t('cleanup.gpsFrom.exif') : t('cleanup.gpsFrom.device')} · {fmtCoord(g.lat, g.lon)}</span> : null}
    </div>
  );

  return (
    <div className="page narrow">
      <div className="page-head"><div><h1>{t('cleanup.title')}</h1><p>{t('cleanup.body')}</p></div></div>
      <form className="card stack" onSubmit={kirim} noValidate>
        {header}
        <div className={`grid-2 ${fe.errs.foto ? 'group-err' : ''}`} id="c-foto" tabIndex={-1}>
          {fotoBox('b', before, setFoto, gB)}
          {fotoBox('a', after, setFoto, gA)}
        </div>
        <FieldError id="c-foto-err" error={fe.errs.foto} />
        {fotoErr ? <Notice kind="bad">{fotoErr}</Notice> : geoMsg}
        <Field id="desk" label={t('cleanup.desc')} error={fe.errs.deskripsi}
          hint={desk.trim().length < 10 ? t('cleanup.desc.min', { n: desk.trim().length }) : t('form.charsLeft', { n: 2000 - desk.length })}>
          <textarea id="desk" className="textarea" value={desk} onChange={(e) => { setDesk(e.target.value); fe.hapus('deskripsi'); }} placeholder={t('cleanup.desc.ph')} maxLength={2000} />
        </Field>
        <div className="grid-2">
          <Field id="orang" label={t('cleanup.people')} error={fe.errs.peserta}>
            <input id="orang" className="input" type="number" min="1" max="500" inputMode="numeric" value={orang} onChange={(e) => { setOrang(e.target.value); fe.hapus('peserta'); }} /></Field>
          <Field id="kg" label={t('cleanup.weight')} optional error={fe.errs.berat}>
            <input id="kg" className="input" type="number" min="0" step="0.5" inputMode="decimal" value={kg} onChange={(e) => { setKg(e.target.value); fe.hapus('berat'); }} /></Field>
        </div>
        <FormSummary errs={fe.errs} ids={CLEAN_IDS} labels={{ foto: t('cleanup.photos'), deskripsi: t('cleanup.desc'), peserta: t('cleanup.people'), berat: t('cleanup.weight') }} />
        {fe.umum ? <Notice kind="bad">{errText(t, fe.umum)}</Notice> : null}
        {busy && retry > 1 ? <Notice kind="warn">{t('report.retrying', { n: retry })}</Notice> : null}
        <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
          {busy ? <Spinner /> : <Send size={18} aria-hidden="true" />}{t('cleanup.send')}
        </button>
      </form>
      {consent && typeof consent === 'object' ? (
        <ConsentDialog onDone={(ok) => {
          const which = consent.ask; setConsent(ok);
          if (ok) setTimeout(() => document.querySelector(`.photo-${which} input[type=file]`)?.click(), 50);
        }} />
      ) : null}
      {lepas ? (
        <Dialog title={t('cleanup.release')} onClose={() => setLepas(false)}
          actions={(<><button type="button" className="btn btn-ghost" onClick={() => setLepas(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-danger" onClick={lepasKlaim}><Recycle size={16} aria-hidden="true" />{t('cleanup.release')}</button></>)}>
          <p className="muted">{t('cleanup.release.confirm', { k: k.kode })}</p>
        </Dialog>
      ) : null}
    </div>
  );
}
