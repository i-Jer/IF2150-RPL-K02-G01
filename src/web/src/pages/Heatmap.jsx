import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Crosshair, MapPinned, MapPin, ChevronUp, ChevronDown, Recycle, ArrowRight } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api, mediaUrl } from '../api/client.js';
import { onLive } from '../api/live.js';
import { MapView } from '../components/MapView.jsx';
import { Dialog, Kat, LotTag, Mark, Notice, Spinner, useToast } from '../components/ui.jsx';
import { ambilKoordinatGPS } from '../lib/device.js';
import { daysSince, fmtCoord, fmtDate, fmtNum, isNative } from '../lib/platform.js';

const KAT = ['Sehat', 'Waspada', 'Berbahaya'];

function useHeatmap(kategori) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lit, setLit] = useState(new Set());
  const prev = useRef(new Map());
  const load = useCallback(async (live) => {
    try {
      const q = kategori.length ? kategori.join(',') : '';
      const r = await api.get(`/heatmap?kategori=${encodeURIComponent(q)}`);
      // The sheen: hotspots that are new or changed status since the last load. Keyed by the stable hotspot
      // code: cluster ids are regenerated on every heat recompute.
      // They keep the sheen until the viewer has seen them (see LotRow).
      if (live) {
        const changed = [];
        for (const p of r.papan) {
          const before = prev.current.get(p.kode);
          if (before !== `${p.kode}|${p.statusLaporan}`) changed.push(p.kode);
        }
        if (changed.length) setLit((s) => new Set([...s, ...changed]));
      }
      prev.current = new Map(r.papan.map((p) => [p.kode, `${p.kode}|${p.statusLaporan}`]));
      setData({ ...r, dimuat: new Date() }); setError(null);
    } catch (e) { setError(e); }
  }, [kategori]);
  useEffect(() => { load(false); }, [load]);
  useEffect(() => onLive('heatmap', () => load(true)), [load]);
  const seen = useCallback((id) => setLit((s) => { if (!s.has(id)) return s; const n = new Set(s); n.delete(id); return n; }), []);
  return { data, error, reload: load, lit, seen };
}

/**
 * Place search with suggestions as you type (abbreviations like "BSD" are expanded by the server).
 * Arrow keys move through suggestions, Enter picks the highlighted (or first) one, Escape closes.
 */
function SearchBox({ onFound }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [saran, setSaran] = useState([]);
  const [open, setOpen] = useState(false);
  const [aktif, setAktif] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    const kata = q.trim();
    if (kata.length < 2) { setSaran([]); setBusy(false); return undefined; }
    const id = ++reqId.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api.get(`/heatmap/saran?q=${encodeURIComponent(kata)}`);
        if (id !== reqId.current) return;
        setSaran(r); setAktif(r.length ? 0 : -1); setErr(r.length ? null : t('map.notFound'));
      } catch (x) {
        if (id === reqId.current) { setSaran([]); setErr(errText(t, x)); }
      } finally { if (id === reqId.current) setBusy(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [q, t]);

  function pilih(s) {
    if (!s) return;
    setQ(s.nama); setOpen(false); setSaran([]); setErr(null);
    reqId.current += 1;
    onFound(s);
  }
  function onKey(e) {
    if (e.key === 'ArrowDown' && saran.length) { e.preventDefault(); setOpen(true); setAktif((a) => (a + 1) % saran.length); }
    else if (e.key === 'ArrowUp' && saran.length) { e.preventDefault(); setOpen(true); setAktif((a) => (a <= 0 ? saran.length - 1 : a - 1)); }
    else if (e.key === 'Escape') setOpen(false);
  }
  function submit(e) {
    e.preventDefault();
    if (saran.length) pilih(saran[Math.max(0, aktif)]);
  }
  const tampil = open && q.trim().length >= 2 && (saran.length > 0 || (!busy && err));
  return (
    <form className="mapsearch" onSubmit={submit} role="search" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <label htmlFor="cari" className="sr-only">{t('map.search')}</label>
      <Search size={18} aria-hidden="true" className="mapsearch-ic" />
      <input id="cari" className="input" value={q} autoComplete="off" spellCheck={false} placeholder={t('map.search')}
        role="combobox" aria-expanded={!!tampil} aria-controls="cari-saran" aria-autocomplete="list"
        aria-activedescendant={tampil && aktif >= 0 ? `saran-${aktif}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setErr(null); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {q ? <button type="button" className="iconbtn mapsearch-x" aria-label={t('common.close')} onClick={() => { setQ(''); setSaran([]); setErr(null); }}><X size={16} /></button> : null}
      <button className="iconbtn mapsearch-go" disabled={busy && !saran.length} aria-label={t('map.searchGo')}>{busy ? <Spinner size={18} /> : <ArrowRight size={18} aria-hidden="true" />}</button>
      {tampil ? (
        <ul className="saran" id="cari-saran" role="listbox" aria-label={t('map.search')}>
          {saran.length ? saran.map((s, i) => (
            <li key={`${s.nama}-${s.lat}-${s.lon}`} id={`saran-${i}`} role="option" aria-selected={i === aktif}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => pilih(s)} onMouseEnter={() => setAktif(i)}>
                <MapPin size={16} aria-hidden="true" />
                <span><b>{s.nama}</b>{s.detail ? <small>{s.detail}</small> : null}</span>
              </button>
            </li>
          )) : <li className="saran-none" role="option" aria-selected="false" aria-disabled="true">{err}</li>}
        </ul>
      ) : null}
    </form>
  );
}

function Filters({ kategori, setKategori, showPending, setShowPending }) {
  const { t } = useI18n();
  const toggle = (k) => setKategori((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k].sort((a, b) => KAT.indexOf(a) - KAT.indexOf(b))));
  return (
    <div className="stack-sm">
      <span className="board-label" id="flt">{t('map.filter')}</span>
      <div className="chips" role="group" aria-labelledby="flt">
        {KAT.map((k) => (
          <button key={k} type="button" className={`chip c-${k.toLowerCase()}`} aria-pressed={kategori.includes(k)} onClick={() => toggle(k)}>
            <span className="dot" style={{ background: `var(--${k.toLowerCase()})` }} />{t(`kat.${k}`)}
          </button>
        ))}
      </div>
      <label className="switch">
        <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />
        <span>{t('map.showPending')}</span>
      </label>
    </div>
  );
}

/** A changed row keeps its sheen until it has been fully on screen for a few seconds (or is clicked). */
function useSeenAfterView(ref, active, onSeen) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    let timer = null;
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(timer);
      if (e.isIntersecting && document.visibilityState === 'visible') timer = setTimeout(onSeen, 4000);
    }, { threshold: 0.9 });
    io.observe(ref.current);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, [ref, active, onSeen]);
}

function LotRow({ p, selected, lit, onPick, onSeen, rowRef }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const seen = useCallback(() => onSeen(p.kode), [onSeen, p.kode]);
  useSeenAfterView(ref, lit, seen);
  const held = p.statusLaporan === 'Diklaim';
  return (
    <li ref={rowRef}>
      <button ref={ref} type="button" className={`lot lot-rich ${selected ? 'sel' : ''} ${lit ? 'lit' : ''}`}
        aria-current={selected ? 'true' : undefined} onClick={() => { seen(); onPick(p); }}>
        <span className="lot-main">
          <LotTag kode={p.kode} kat={p.kategoriKualitas} />
          <b>{p.lokasiNama || fmtCoord(p.lat, p.lon)}</b>
          <small>
            {p.jumlahLaporan === 1 ? t('common.report1') : t('common.reports', { n: p.jumlahLaporan })}
            {' · '}{held ? t('status.Diklaim') : t('common.days', { n: Math.round(p.rataRataHari) })}
          </small>
        </span>
        <Mark status={held ? 'Aktif' : 'Belum diklaim'} prefix="klaim" bare />
        <span className="heat" aria-label={`${t('common.heat')} ${Math.round(p.heatIntensity)}`}>{Math.round(p.heatIntensity)}</span>
      </button>
    </li>
  );
}

function Lots({ papan, selected, onPick, lit, onSeen }) {
  const { t } = useI18n();
  // Rank motion: rows slide from their old position to their new rank (FLIP) instead of jumping.
  const nodes = useRef(new Map());
  const before = useRef(new Map());
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const [id, el] of nodes.current) {
      if (!el) continue;
      const top = el.offsetTop;
      const old = before.current.get(id);
      if (!reduce && old != null && old !== top) {
        el.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      }
      before.current.set(id, top);
    }
  }, [papan]);
  if (!papan.length) return <p className="board-empty">{t('map.noBoard')}</p>;
  return (
    <>
      <ol className="lots" aria-label={t('map.board')}>
        {papan.map((p) => (
          <LotRow key={p.kode} p={p} selected={selected === p.kode} lit={lit.has(p.kode)} onPick={onPick} onSeen={onSeen}
            rowRef={(el) => { if (el) nodes.current.set(p.kode, el); else nodes.current.delete(p.kode); }} />
        ))}
      </ol>
    </>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <div className="legend" aria-label={t('map.legend')}>
      {KAT.map((k) => (
        <span key={k} className="legend-i"><i style={{ background: `var(--${k.toLowerCase()})` }} /><span><b>{t(`kat.${k}`)}</b><small>{t(`kat.${k}.desc`)}</small></span></span>
      ))}
      <span className="legend-i"><i className="hollow" /><span><b>{t('map.pending')}</b><small>{t('map.pending.desc')}</small></span></span>
    </div>
  );
}

function Detail({ idLaporan, onClose, onClaimed }) {
  const { t, lang } = useI18n();
  const { akun, isRelawan } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [klaim, setKlaim] = useState(null);
  const [err, setErr] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const r = await api.get(`/heatmap/titik/${idLaporan}`);
      setD(r);
      if (akun) setKlaim(await api.get(`/klaim/${idLaporan}`).catch(() => null));
    } catch (e) { setErr(e); }
  }, [idLaporan, akun]);
  useEffect(() => { setD(null); load(); }, [load]);

  async function claim() {
    setBusy(true);
    try {
      await api.post(`/klaim/${idLaporan}`, {});
      toast({ title: t('map.claim.ok'), kind: 'ok' });
      setConfirm(false);
      await load();
      onClaimed?.();
    } catch (e) {
      setConfirm(false);
      toast({ title: errText(t, e), kind: 'bad' });
      await load();
    } finally { setBusy(false); }
  }

  if (err) return <aside className="detail card"><Notice kind="bad">{errText(t, err)}</Notice></aside>;
  if (!d) return <aside className="detail card" aria-busy="true"><div className="skel" style={{ height: 30, width: 120 }} /><div className="skel" style={{ height: 160, marginTop: 14 }} /></aside>;
  const l = d.detail;
  const hari = daysSince(l.tanggalLaporan);
  const status = klaim?.statusKlaim || (l.statusLaporan === 'Diklaim' ? 'Aktif' : 'Belum diklaim');
  let action;
  if (!akun) action = <Link className="btn btn-primary btn-block btn-lg" to={`/masuk?ke=${encodeURIComponent(`/peta?titik=${l.kode}`)}`}>{t('map.claim.signin')}</Link>;
  else if (!isRelawan) action = <p className="muted small">{t('map.claim.verifier')}</p>;
  else if (klaim?.milikSaya) action = (
    <div className="stack-sm">
      <Notice kind="ok">{t('map.claimed.byYou', { d: fmtDate(klaim.klaimSaya?.batasWaktu, lang) })}</Notice>
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => nav('/pembersihan')}><Recycle size={18} aria-hidden="true" />{t('map.goCleanup')}</button>
    </div>
  );
  else if (l.statusLaporan === 'Diklaim') action = <Notice kind="warn">{t('map.claimed.byOther', { n: l.namaPengklaim || '-', d: fmtDate(l.batasWaktuKlaim, lang) })}</Notice>;
  else if (klaim?.klaimSaya) action = <Notice kind="info">{t('map.claim.haveOne', { k: klaim.klaimSaya.kode })}</Notice>;
  else action = <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => setConfirm(true)}>{t('map.claim')}</button>;

  return (
    <aside className="detail card" aria-label={t('map.detail')}>
      <div className="detail-head">
        <LotTag kode={l.kode} kat={l.indikatorTingkat} size="lg" />
        <button type="button" className="iconbtn" onClick={onClose} aria-label={t('common.close')}><X size={20} /></button>
      </div>
      <h2 className="detail-title">{l.lokasiNama || fmtCoord(l.lat, l.lon)}</h2>
      <p className="muted small">{fmtCoord(l.lat, l.lon)}</p>
      {d.bukti?.[0] ? <img className="detail-photo" src={mediaUrl(d.bukti[0].fotoUrl)} alt={t('map.photo')} loading="lazy" /> : null}
      <dl className="kv detail-kv">
        <dt>{t('report.level')}</dt><dd><Kat k={l.indikatorTingkat} /></dd>
        <dt>{t('common.heat')}</dt><dd><span className="stencil" style={{ fontSize: 22 }}>{Math.round(d.klaster?.heatIntensity || 0)}</span> <span className="muted small">{t('map.clusterOf', { n: d.klaster?.jumlahLaporan || 1 })}</span></dd>
        <dt>{t('map.openFor')}</dt><dd>{hari === 0 ? t('common.today') : hari === 1 ? t('common.day') : t('common.days', { n: hari })}</dd>
        <dt>{t('map.reportedOn')}</dt><dd>{fmtDate(l.tanggalLaporan, lang)}</dd>
        {l.jenisSampah?.length ? (<><dt>{t('map.wasteTypes')}</dt><dd>{l.jenisSampah.map((j) => t(`jenis.${j}`)).join(', ')}</dd></>) : null}
        {l.perkiraanVolume ? (<><dt>{t('map.volume')}</dt><dd>{t(`vol.${l.perkiraanVolume}`)}</dd></>) : null}
        <dt>{t('map.claimStatus')}</dt><dd><Mark status={status} prefix="klaim" /></dd>
        <dt>{t('map.points')}</dt><dd>{t('common.points', { n: Math.max(1, Math.round(d.klaster?.heatIntensity || 1)) })}</dd>
      </dl>
      {l.deskripsi ? <p className="detail-desc">{l.deskripsi}</p> : null}
      <div className="detail-action">{action}</div>
      {confirm ? (
        <Dialog title={t('map.confirm.title', { k: l.kode })} onClose={() => setConfirm(false)}
          actions={(
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn btn-primary" onClick={claim} disabled={busy}>{busy ? <Spinner /> : null}{t('map.claim')}</button>
            </>
          )}>
          <p className="muted">{t('map.confirm.body', { p: l.lokasiNama || l.kode })}</p>
        </Dialog>
      ) : null}
    </aside>
  );
}

export default function Heatmap() {
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const [kategori, setKategori] = useState(KAT);
  const [showPending, setShowPending] = useState(false);
  const { data, error, reload, lit, seen } = useHeatmap(kategori);
  const [sel, setSel] = useState(null); // {kode, idLaporan}; kode is stable across heat recomputes
  const [focus, setFocus] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [posisi, setPosisi] = useState(null);
  const toast = useToast();

  // Deep link /peta?titik=LP-0012
  useEffect(() => {
    const kode = params.get('titik');
    if (!kode || !data) return;
    const p = data.papan.find((x) => x.kode === kode) || data.titik.find((x) => x.kode === kode);
    if (p) { setSel({ kode: p.kode, idLaporan: p.idLaporan }); setFocus({ lat: p.lat, lon: p.lon, zoom: 14 }); }
  }, [params, data]);

  const pickLot = useCallback((p) => {
    setSel({ kode: p.kode, idLaporan: p.idLaporan });
    setFocus({ lat: p.lat, lon: p.lon, zoom: 14 });
    setParams({ titik: p.kode }, { replace: true });
    setSheetOpen(false);
  }, [setParams]);

  const pickKlaster = useCallback((idKlaster) => {
    const p = data?.papan.find((x) => x.idKlaster === idKlaster);
    if (p) pickLot(p);
  }, [data, pickLot]);

  const close = () => { setSel(null); setParams({}, { replace: true }); };
  const kosong = data && kategori.length < 3 && data.klaster.length === 0;
  const r = data?.ringkasan;
  const summary = useMemo(() => (r ? [
    [r.aktif, t('map.summary.active')], [r.diklaim, t('map.summary.claimed')], [r.dibersihkan, t('map.summary.cleaned')], [r.menunggu, t('map.summary.pending')],
  ] : []), [r, t]);

  async function lokasiSaya() {
    try { const g = await ambilKoordinatGPS(); setFocus({ lat: g.lat, lon: g.lon, zoom: 13 }); setPosisi({ lat: g.lat, lon: g.lon, label: t('map.youHere') }); } catch (e) { toast({ title: t(e.code === 'GEO_DENIED' && isNative ? 'e.GEO_DENIED_APP' : String(e.code || '').startsWith('GEO_') ? `e.${e.code}` : 'e.GEO_UNAVAILABLE'), kind: 'bad', ms: 8000 }); }
  }

  return (
    <div className="heatmap">
      <section className={`board heat-board ${sheetOpen ? 'open' : ''}`} aria-label={t('map.board')}>
        <button type="button" className="sheet-handle" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen}>
          {sheetOpen ? <ChevronDown size={20} aria-hidden="true" /> : <ChevronUp size={20} aria-hidden="true" />}
          <span>{t('map.board')}</span>
          <span className="sheet-count">{data ? data.papan.length : ''}</span>
        </button>
        <div className="heat-board-head">
          <h1 className="heat-title">{t('map.board')}</h1>
          <p className="sub">{t('map.boardSub')}{data ? ` · ${t('common.updated', { t: data.dimuat.toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) })}` : ''}</p>
        </div>
        <div className="heat-board-tools">
          <Filters kategori={kategori} setKategori={setKategori} showPending={showPending} setShowPending={setShowPending} />
          {r ? (
            <dl className="tally">
              {summary.map(([n, label]) => (<div key={label}><dt>{label}</dt><dd>{fmtNum(n, lang)}</dd></div>))}
            </dl>
          ) : null}
        </div>
        <div className="heat-board-list">
          {error ? (
            <div style={{ padding: 16 }}><Notice kind="bad">{errText(t, error)}</Notice><button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => reload(false)}>{t('common.retry')}</button></div>
          ) : !data ? (
            <div style={{ padding: 16 }} className="stack-sm">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 44, opacity: 0.15 }} />)}</div>
          ) : (
            <Lots papan={data.papan} selected={sel?.kode} onPick={pickLot} lit={lit} onSeen={seen} />
          )}
        </div>
      </section>
      <section className="heat-map">
        <SearchBox onFound={(loc) => setFocus(loc.bbox ? { bbox: loc.bbox } : { lat: loc.lat, lon: loc.lon, zoom: 12 })} />
        <MapView label={t('a11y.map')} posisiSaya={posisi} data={data} showPending={showPending} selectedKlaster={sel ? data?.papan.find((x) => x.kode === sel.kode)?.idKlaster : undefined} onSelect={pickKlaster} focus={focus} />
        <button type="button" className="iconbtn locate" onClick={lokasiSaya} aria-label={t('map.locate')} title={t('map.locate')}><Crosshair size={20} /></button>
        <Legend />
        {kosong ? <div className="map-empty"><Notice kind="info">{t('map.emptyFilter')}</Notice></div> : null}
        {!data && !error ? <div className="map-loading"><Spinner size={26} /></div> : null}
        {sel ? <Detail idLaporan={sel.idLaporan} onClose={close} onClaimed={() => reload(true)} /> : null}
        {!sel && data && !data.papan.length && !kosong ? (
          <div className="map-empty"><Notice kind="info"><MapPinned size={16} aria-hidden="true" /> {t('map.noBoard')}</Notice></div>
        ) : null}
      </section>
    </div>
  );
}
