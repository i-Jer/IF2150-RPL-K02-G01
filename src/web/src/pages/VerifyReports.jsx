import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, ScrollText, ArrowLeft } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { api, mediaUrl } from '../api/client.js';
import { onLive } from '../api/live.js';
import { Decision } from '../components/Decision.jsx';
import { Empty, Kat, LotTag, Mark, Notice, useToast } from '../components/ui.jsx';
import { fmtCoord, fmtDate, fmtDateTime, fmtJarak } from '../lib/platform.js';

export default function VerifyReports() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState('Menunggu Verifikasi');
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [selId, setSelId] = useState(null);
  const [det, setDet] = useState(null);

  const load = useCallback(async () => {
    try { setList(await api.get(`/verifikasi/laporan?status=${encodeURIComponent(tab)}`)); setErr(null); } catch (e) { setErr(e); }
  }, [tab]);
  useEffect(() => { setList(null); setSelId(null); load(); }, [load]);
  useEffect(() => onLive('antrean', (d) => { if (d?.jenis === 'laporan') load(); }), [load]);
  useEffect(() => {
    if (!selId) { setDet(null); return; }
    setDet(null);
    api.get(`/verifikasi/laporan/${selId}`).then(setDet).catch((e) => setDet({ error: e }));
  }, [selId]);

  async function decide(body) {
    try {
      const r = await api.post(`/verifikasi/laporan/${selId}`, body);
      toast({ title: t('vr.decided', { k: r.kode, s: t(`status.${r.status}`) }), kind: r.status === 'Disetujui' ? 'ok' : 'bad' });
      setSelId(null); load();
    } catch (e) {
      if (e.code === 'ALREADY_DECIDED') { setSelId(null); load(); }
      throw e;
    }
  }

  const overdue = (d) => Date.now() - new Date(d).getTime() > 24 * 3600 * 1000;
  const l = det?.detailLaporan;
  const b = det?.detailBukti?.[0];
  return (
    <div className="page wide">
      <div className="page-head">
        <div><h1>{t('vr.title')}</h1><p>{t('vr.body')}</p></div>
        <Link className="btn btn-ghost btn-sm" to="/admin/log"><ScrollText size={16} aria-hidden="true" />{t('audit.title')}</Link>
      </div>
      <div className="seg" role="tablist" style={{ marginBottom: 14 }}>
        {['Menunggu Verifikasi', 'Disetujui', 'Ditolak'].map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} aria-pressed={tab === s} onClick={() => setTab(s)}>
            {s === 'Menunggu Verifikasi' ? t('vr.tab.pending') : t(`status.${s}`)}
          </button>
        ))}
      </div>
      <div className={`split ${selId ? 'has-sel' : ''}`}>
        <section className="card split-list" style={{ padding: 0 }}>
          {err ? <div style={{ padding: 16 }}><Notice kind="bad">{errText(t, err)}</Notice></div>
            : !list ? <div style={{ padding: 16 }} className="stack-sm">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 48 }} />)}</div>
              : !list.length ? <Empty icon={Inbox} title={t('vr.empty')} />
                : (
                  <table className="table">
                    <thead><tr><th>{t('vr.col.id')}</th><th className="hide-sm">{t('vr.col.photo')}</th><th>{t('vr.col.place')}</th><th className="hide-sm">{t('vr.col.date')}</th><th>{t('vr.col.status')}</th></tr></thead>
                    <tbody>
                      {list.map((x) => (
                        <tr key={x.idLaporan} aria-selected={selId === x.idLaporan} tabIndex={0}
                          onClick={() => setSelId(x.idLaporan)} onKeyDown={(e) => { if (e.key === 'Enter') setSelId(x.idLaporan); }}>
                          <td><LotTag kode={x.kode} kat={x.indikatorTingkat} /></td>
                          <td className="hide-sm">{x.fotoUrl ? <img className="thumb" src={mediaUrl(x.fotoUrl)} alt="" loading="lazy" /> : <span className="thumb" />}</td>
                          <td><b>{x.lokasiNama || fmtCoord(x.lat, x.lon)}</b><div className="muted small">{fmtCoord(x.lat, x.lon)}</div></td>
                          <td className="hide-sm">{fmtDate(x.tanggalLaporan, lang)}{tab === 'Menunggu Verifikasi' && overdue(x.tanggalLaporan) ? <div className="err small">{t('vr.overdue')}</div> : null}</td>
                          <td><Mark status={x.statusLaporan} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
        </section>
        <section className="card split-detail">
          {!selId ? <Empty title={t('vr.pick')} />
            : det?.error ? <Notice kind="bad">{errText(t, det.error)}</Notice>
              : !det ? <div className="skel" style={{ height: 380 }} />
                : (
                  <div className="stack">
                    <button type="button" className="btn btn-quiet btn-sm back-sm" onClick={() => setSelId(null)}><ArrowLeft size={16} aria-hidden="true" />{t('common.back')}</button>
                    <div className="row-flex"><LotTag kode={l.kode} kat={l.indikatorTingkat} size="lg" /><Mark status={l.statusLaporan} /></div>
                    {b ? <a href={mediaUrl(b.fotoUrl)} target="_blank" rel="noreferrer"><img className="evidence" src={mediaUrl(b.fotoUrl)} alt={t('map.photo')} /></a> : null}
                    <dl className="kv">
                      <dt>{t('vr.col.place')}</dt><dd>{l.lokasiNama || '-'}<div className="muted small">{fmtCoord(l.lat, l.lon)}</div></dd>
                      <dt>{t('report.level')}</dt><dd><Kat k={l.indikatorTingkat} /></dd>
                      <dt>{t('vr.exif')}</dt><dd>{b?.metadataEXIF?.lat != null ? (
                        <>
                          {fmtCoord(b.metadataEXIF.lat, b.metadataEXIF.lon)}
                          {b.jarakExifM != null ? <div className={`small ${b.jarakExifM > 110 ? 'err' : 'muted'}`}>{t('vr.exif.dist', { m: fmtJarak(b.jarakExifM, lang) })}</div> : null}
                          {b.metadataEXIF.kamera ? <div className="muted small">{t('vr.camera')}: {b.metadataEXIF.kamera}</div> : null}
                          {b.metadataEXIF.waktuAmbil ? <div className="muted small">{t('vr.taken')}: {fmtDateTime(b.metadataEXIF.waktuAmbil, lang)}</div> : null}
                        </>
                      ) : <span className="muted">{t('vr.exif.none')}</span>}</dd>
                      <dt>{t('vr.reporter')}</dt><dd>{det.dataPelapor?.nama} <span className="muted small">({det.dataPelapor?.email})</span>{det.dataPelapor?.jumlahTeguran ? <div className="err small">{t('admin.warnings')}: {det.dataPelapor.jumlahTeguran}</div> : null}</dd>
                      <dt>{t('map.reportedOn')}</dt><dd>{fmtDateTime(l.tanggalLaporan, lang)}</dd>
                      {l.jenisSampah?.length ? (<><dt>{t('map.wasteTypes')}</dt><dd>{l.jenisSampah.map((j) => t(`jenis.${j}`)).join(', ')}</dd></>) : null}
                      {l.perkiraanVolume ? (<><dt>{t('map.volume')}</dt><dd>{t(`vol.${l.perkiraanVolume}`)}</dd></>) : null}
                      {l.catatanVerifikasi ? (<><dt>{t('vr.reason')}</dt><dd>{l.catatanVerifikasi}</dd></>) : null}
                    </dl>
                    {l.deskripsi ? <p className="detail-desc">{l.deskripsi}</p> : null}
                    {l.statusLaporan === 'Menunggu Verifikasi' ? <Decision onDecide={decide} /> : null}
                  </div>
                )}
        </section>
      </div>
    </div>
  );
}
