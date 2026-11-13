import { useCallback, useEffect, useState } from 'react';
import { Inbox, ArrowLeft, MapPin } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { api, mediaUrl } from '../api/client.js';
import { onLive } from '../api/live.js';
import { Decision } from '../components/Decision.jsx';
import { Empty, Kat, LotTag, Mark, Notice, useToast } from '../components/ui.jsx';
import { fmtCoord, fmtDate, fmtDateTime, fmtJarak } from '../lib/platform.js';

export default function VerifyCleanups() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState('Menunggu Verifikasi');
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [selId, setSelId] = useState(null);
  const [det, setDet] = useState(null);

  const load = useCallback(async () => {
    try { setList(await api.get(`/verifikasi/pembersihan?status=${encodeURIComponent(tab)}`)); setErr(null); } catch (e) { setErr(e); }
  }, [tab]);
  useEffect(() => { setList(null); setSelId(null); load(); }, [load]);
  useEffect(() => onLive('antrean', (d) => { if (d?.jenis === 'pembersihan') load(); }), [load]);
  useEffect(() => {
    if (!selId) { setDet(null); return; }
    setDet(null);
    api.get(`/verifikasi/pembersihan/${selId}`).then(setDet).catch((e) => setDet({ error: e }));
  }, [selId]);

  async function decide(body) {
    try {
      const r = await api.post(`/verifikasi/pembersihan/${selId}`, body);
      toast({ title: t('vr.decided', { k: r.kode, s: t(`status.${r.status}`) }) + (r.poin ? ` · +${r.poin}` : ''), kind: r.status === 'Disetujui' ? 'ok' : 'bad' });
      setSelId(null); load();
    } catch (e) {
      if (e.code === 'ALREADY_DECIDED') { setSelId(null); load(); }
      throw e;
    }
  }

  const p = det?.detailPembersihan;
  const f = det?.fotoBeforeAfter;
  const foto = (label, x) => (
    <figure className="ba">
      <figcaption>{label}</figcaption>
      <a href={mediaUrl(x.url)} target="_blank" rel="noreferrer"><img src={mediaUrl(x.url)} alt={label} /></a>
      <span className={`pill ${x.jarakM > 110 ? '' : 'dark'}`}><MapPin size={12} aria-hidden="true" />{t('cleanup.distance', { m: fmtJarak(x.jarakM, lang) })} · {x.sumber === 'exif' ? t('cleanup.gpsFrom.exif') : t('cleanup.gpsFrom.device')}</span>
    </figure>
  );

  return (
    <div className="page wide">
      <div className="page-head"><div><h1>{t('vc.title')}</h1><p>{t('vc.body')}</p></div></div>
      <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
        {['Menunggu Verifikasi', 'Disetujui', 'Ditolak'].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} aria-pressed={tab === s} onClick={() => setTab(s)}>
            {s === 'Menunggu Verifikasi' ? t('vr.tab.pending') : t(`status.${s}`)}
          </button>
        ))}
      </div>
      <div className={`split narrow-list ${selId ? 'has-sel' : ''}`}>
        <section className="card split-list" style={{ padding: 0 }}>
          {err ? <div style={{ padding: 16 }}><Notice kind="bad">{errText(t, err)}</Notice></div>
            : !list ? <div style={{ padding: 16 }} className="stack-sm">{[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 64 }} />)}</div>
              : !list.length ? <Empty icon={Inbox} title={t('vc.empty')} />
                : (
                  <ul className="sublist">
                    {list.map((x) => (
                      <li key={x.idPembersihan}>
                        <button type="button" aria-current={selId === x.idPembersihan ? 'true' : undefined} onClick={() => setSelId(x.idPembersihan)}>
                          <span className="row-flex" style={{ gap: 8 }}><LotTag kode={x.kode} /><b>{x.lokasiNama}</b></span>
                          <small>{x.namaRelawan} · {fmtDate(x.tglSelesai, lang)}</small>
                          <Mark status={x.statusPembersihan} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
        </section>
        <section className="card split-detail">
          {!selId ? <Empty title={t('vc.pick')} />
            : det?.error ? <Notice kind="bad">{errText(t, det.error)}</Notice>
              : !det ? <div className="skel" style={{ height: 420 }} />
                : (
                  <div className="stack">
                    <button type="button" className="btn btn-quiet btn-sm back-sm" onClick={() => setSelId(null)}><ArrowLeft size={16} aria-hidden="true" />{t('common.back')}</button>
                    <div className="row-flex"><LotTag kode={p.kode} size="lg" /><Mark status={p.statusPembersihan} /></div>
                    <div className="ba-grid">{foto(t('cleanup.before'), f.before)}{foto(t('cleanup.after'), f.after)}</div>
                    <dl className="kv">
                      <dt>{t('vc.lot')}</dt><dd><span className="row-flex" style={{ gap: 8 }}><LotTag kode={p.kodeKlaim} /> {p.lokasiNama} <Kat k={p.indikatorTingkat} /></span><div className="muted small">{p.kodeLaporan} · {fmtCoord(p.lat, p.lon)}</div></dd>
                      <dt>{t('vc.desc')}</dt><dd style={{ fontWeight: 500 }}>{p.deskripsiKegiatan}</dd>
                      <dt>{t('cleanup.people')}</dt><dd>{p.jumlahPeserta}</dd>
                      {p.perkiraanBeratKg != null ? (<><dt>{t('cleanup.weight')}</dt><dd>{p.perkiraanBeratKg} kg</dd></>) : null}
                      <dt>{t('vc.finished')}</dt><dd>{fmtDateTime(p.tglSelesai, lang)}</dd>
                      <dt>{t('vr.reporter')}</dt><dd>{p.namaRelawan}</dd>
                      <dt>{t('vc.points')}</dt><dd><span className="stencil" style={{ fontSize: 24 }}>{p.poinDiberikan ?? det.perkiraanPoin}</span></dd>
                      {p.catatanVerifikasi ? (<><dt>{t('vr.reason')}</dt><dd>{p.catatanVerifikasi}</dd></>) : null}
                    </dl>
                    {det.fotoLaporan ? (
                      <details><summary className="muted small" style={{ cursor: 'pointer' }}>{t('vc.original')}</summary>
                        <img className="evidence" style={{ marginTop: 10 }} src={mediaUrl(det.fotoLaporan.fotoUrl)} alt={t('vc.original')} /></details>
                    ) : null}
                    {p.statusPembersihan === 'Menunggu Verifikasi' ? <Decision onDecide={decide} /> : null}
                  </div>
                )}
        </section>
      </div>
    </div>
  );
}
