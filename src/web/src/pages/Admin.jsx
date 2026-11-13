import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ScrollText, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api } from '../api/client.js';
import { Empty, Mark, Notice, Spinner } from '../components/ui.jsx';
import { Field, useFormErrors } from '../components/Field.jsx';
import { fmtDate, fmtNum } from '../lib/platform.js';

const AKUN_IDS = { nama: 'an', email: 'ae', peran: 'ar', instansi: 'ai' };
const AKUN_KODE = new Set(['NAME_INVALID', 'EMAIL_INVALID', 'EMAIL_TAKEN', 'ROLE_INVALID', 'INSTITUTION_REQUIRED']);
const KOM_IDS = { namaKomunitas: 'kn', wilayah: 'kw', deskripsiKomunitas: 'kd' };
const KOM_KODE = new Set(['COMMUNITY_NAME_INVALID', 'COMMUNITY_EXISTS', 'COMMUNITY_REGION_TOO_LONG', 'COMMUNITY_DESC_TOO_LONG']);

function AkunForm({ id, onSaved }) {
  const { t, lang } = useI18n();
  const { akun: saya } = useAuth();
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const fa = useFormErrors(AKUN_IDS);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await api.get(`/admin/akun/${id}`);
    setD(r);
    setF({ nama: r.akun.nama, email: r.akun.email, peran: r.akun.peran, instansi: r.akun.instansi || '', instansiTerverifikasi: false, idKomunitas: r.akun.idKomunitas || '' });
  }, [id]);
  useEffect(() => { setD(null); setMsg(null); load().catch((e) => setMsg({ err: e })); }, [load]);

  async function simpan(extra = {}) {
    setBusy(true); setMsg(null);
    const body = { ...extra };
    if (!extra.statusAkun) {
      if (f.nama !== d.akun.nama) body.nama = f.nama;
      if (f.email !== d.akun.email) body.email = f.email;
      if ((f.idKomunitas || null) !== (d.akun.idKomunitas || null)) body.idKomunitas = f.idKomunitas || null;
      if (f.peran !== d.akun.peran) { body.peran = f.peran; body.instansi = f.instansi; body.instansiTerverifikasi = f.instansiTerverifikasi; }
    }
    try { await api.put(`/admin/akun/${id}`, body); setMsg({ ok: true }); await load(); onSaved(); }
    catch (e) { if (AKUN_KODE.has(e?.code)) { fa.tangkap(e); setMsg(null); } else setMsg({ err: e }); } finally { setBusy(false); }
  }

  if (msg?.err && !d) return <Notice kind="bad">{errText(t, msg.err)}</Notice>;
  if (!d || !f) return <div className="skel" style={{ height: 380 }} />;
  const a = d.akun;
  const diri = a.idRelawan === saya.idRelawan;
  const roleBerubah = f.peran !== a.peran && f.peran !== 'Relawan';
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); simpan(); }}>
      <h2>{t('admin.editAccount', { n: a.nama })}</h2>
      <div className="row-flex small muted"><span className="tag k-muted" style={{ height: 22, fontSize: 16 }}>{a.kode}</span><Mark status={a.statusAkun} prefix="akun" /><span>{t('admin.joined')} {fmtDate(a.dibuat, lang)}</span></div>
      <Field id="an" label={t('auth.name')} error={fa.errs.nama}><input id="an" className="input" value={f.nama} onChange={(e) => { setF({ ...f, nama: e.target.value }); fa.hapus('nama'); }} /></Field>
      <Field id="ae" label={t('auth.email')} error={fa.errs.email}><input id="ae" className="input" type="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); fa.hapus('email'); }} /></Field>
      <Field id="ar" label={t('admin.role')} error={fa.errs.peran} hint={diri ? t('e.SELF_ROLE') : undefined}>
        <select id="ar" className="select" value={f.peran} disabled={diri} onChange={(e) => { setF({ ...f, peran: e.target.value }); fa.hapus('peran'); }}>
          <option value="Relawan">{t('role.Relawan')}</option>
          <option value="Verifikator">{t('role.Verifikator')}</option>
          {saya.peran === 'Admin' ? <option value="Admin">{t('role.Admin')}</option> : null}
        </select></Field>
      {roleBerubah ? (
        <div className="stack-sm r24">
          <Field id="ai" label={t('admin.institution')} error={fa.errs.instansi} hint={t('admin.institution.req')}>
            <input id="ai" className="input" value={f.instansi} placeholder={t('admin.institution.ph')} onChange={(e) => { setF({ ...f, instansi: e.target.value }); fa.hapus('instansi'); }} /></Field>
          <label className="switch"><input type="checkbox" checked={f.instansiTerverifikasi} onChange={(e) => setF({ ...f, instansiTerverifikasi: e.target.checked })} /><span><ShieldCheck size={15} aria-hidden="true" /> {t('admin.institution.verified')}</span></label>
        </div>
      ) : a.instansi ? <p className="small muted">{t('admin.institution')}: {a.instansi}</p> : null}
      {d.statistik ? (
        <dl className="kv small">
          <dt>{t('lb.points')}</dt><dd>{fmtNum(a.totalPoin, lang)}</dd>
          <dt>{t('profile.stats.reports')}</dt><dd>{d.statistik.laporan} ({t('profile.stats.verified').toLowerCase()} {d.statistik.laporanSah})</dd>
          <dt>{t('profile.stats.cleanups')}</dt><dd>{d.statistik.pembersihan}</dd>
          <dt>{t('admin.warnings')}</dt><dd className={a.jumlahTeguran ? 'err' : ''}>{a.jumlahTeguran}</dd>
        </dl>
      ) : null}
      {d.teguran?.length ? (
        <ul className="list small">{d.teguran.map((w) => <li key={w.id} style={{ gridTemplateColumns: '1fr auto' }}><span>{w.alasan} <span className="muted">({w.kodeObjek})</span></span><span className="muted">{fmtDate(w.dibuat, lang)}</span></li>)}</ul>
      ) : null}
      {!diri ? (a.statusAkun === 'Aktif'
        ? <button type="button" className="btn btn-danger" disabled={busy} onClick={() => simpan({ statusAkun: 'Ditangguhkan' })}>{t('admin.suspend')}</button>
        : <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => simpan({ statusAkun: 'Aktif' })}>{t('admin.reactivate')}</button>) : null}
      {msg?.ok ? <Notice kind="ok">{t('admin.saved')}</Notice> : null}
      {msg?.err ? (
        <Notice kind="bad">{t('admin.failed')} {errText(t, msg.err)} <button type="button" className="btn btn-quiet btn-sm" onClick={() => simpan()}>{t('admin.retry')}</button></Notice>
      ) : null}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <Spinner /> : null}{t('common.save')}</button>
    </form>
  );
}

function KomunitasForm({ id, onSaved }) {
  const { t } = useI18n();
  const baru = id === 'baru';
  const [f, setF] = useState(baru ? { namaKomunitas: '', deskripsiKomunitas: '', wilayah: '', terverifikasi: false } : null);
  const [info, setInfo] = useState(null);
  const fk = useFormErrors(KOM_IDS);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMsg(null);
    if (baru) { setF({ namaKomunitas: '', deskripsiKomunitas: '', wilayah: '', terverifikasi: false }); return; }
    setF(null);
    api.get(`/admin/komunitas/${id}`).then((r) => { setInfo(r.komunitas); setF({ namaKomunitas: r.komunitas.namaKomunitas, deskripsiKomunitas: r.komunitas.deskripsiKomunitas, wilayah: r.komunitas.wilayah, terverifikasi: r.komunitas.terverifikasi }); })
      .catch((e) => setMsg({ err: e }));
  }, [id, baru]);
  async function simpan(e) {
    e.preventDefault(); fk.reset(); setMsg(null);
    if (!f.namaKomunitas.trim()) { fk.setField('namaKomunitas', t('e.COMMUNITY_NAME_INVALID')); document.getElementById('kn')?.focus(); return; }
    setBusy(true);
    try { const r = await api.put(`/admin/komunitas/${id}`, f); setMsg({ ok: true }); onSaved(r.komunitas.idKomunitas); }
    catch (x) { if (KOM_KODE.has(x?.code)) fk.tangkap(x); else setMsg({ err: x }); } finally { setBusy(false); }
  }
  if (!f) return msg?.err ? <Notice kind="bad">{errText(t, msg.err)}</Notice> : <div className="skel" style={{ height: 300 }} />;
  return (
    <form className="stack" onSubmit={simpan}>
      <h2>{baru ? t('admin.newCommunity') : t('admin.editCommunity', { n: info?.namaKomunitas || '' })}</h2>
      {info ? <p className="muted small">{info.kode} · {t('admin.members', { n: info.jumlahAnggota })} · {info.totalPoin} {t('lb.points').toLowerCase()}</p> : null}
      <Field id="kn" label={t('admin.cname')} error={fk.errs.namaKomunitas}><input id="kn" className="input" value={f.namaKomunitas} maxLength={100} onChange={(e) => { setF({ ...f, namaKomunitas: e.target.value }); fk.hapus('namaKomunitas'); }} /></Field>
      <Field id="kw" label={t('admin.cregion')} optional error={fk.errs.wilayah}><input id="kw" className="input" value={f.wilayah || ''} maxLength={100} onChange={(e) => { setF({ ...f, wilayah: e.target.value }); fk.hapus('wilayah'); }} /></Field>
      <Field id="kd" label={t('admin.cdesc')} optional error={fk.errs.deskripsiKomunitas}><textarea id="kd" className="textarea" value={f.deskripsiKomunitas || ''} maxLength={1000} onChange={(e) => { setF({ ...f, deskripsiKomunitas: e.target.value }); fk.hapus('deskripsiKomunitas'); }} /></Field>
      <label className="switch"><input type="checkbox" checked={f.terverifikasi} onChange={(e) => setF({ ...f, terverifikasi: e.target.checked })} /><span>{t('admin.cverified')}</span></label>
      {msg?.ok ? <Notice kind="ok">{t('admin.saved')}</Notice> : null}
      {msg?.err ? <Notice kind="bad">{t('admin.failed')} {errText(t, msg.err)}</Notice> : null}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? <Spinner /> : null}{t('common.save')}</button>
    </form>
  );
}

export default function Admin() {
  const { t } = useI18n();
  const [tab, setTab] = useState('akun');
  const [cari, setCari] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [sel, setSel] = useState(null);
  const load = useCallback(async () => {
    try { setData(await api.get(`/admin?cari=${encodeURIComponent(cari)}`)); setErr(null); } catch (e) { setErr(e); }
  }, [cari]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  return (
    <div className="page wide">
      <div className="page-head">
        <div><h1>{t('admin.title')}</h1></div>
        <Link className="btn btn-ghost btn-sm" to="/admin/log"><ScrollText size={16} aria-hidden="true" />{t('audit.title')}</Link>
      </div>
      <div className="row-flex" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'akun'} aria-pressed={tab === 'akun'} onClick={() => { setTab('akun'); setSel(null); }}>{t('admin.accounts')}</button>
          <button type="button" role="tab" aria-selected={tab === 'komunitas'} aria-pressed={tab === 'komunitas'} onClick={() => { setTab('komunitas'); setSel(null); }}>{t('admin.communities')}</button>
        </div>
        {tab === 'akun' ? (
          <div className="searchline"><Search size={16} aria-hidden="true" /><input className="input" value={cari} onChange={(e) => setCari(e.target.value)} placeholder={t('admin.search')} aria-label={t('admin.search')} /></div>
        ) : <button type="button" className="btn btn-primary btn-sm" onClick={() => setSel('baru')}><Plus size={16} aria-hidden="true" />{t('admin.newCommunity')}</button>}
      </div>
      <div className={`split ${sel ? 'has-sel' : ''}`}>
        <section className="card split-list" style={{ padding: 0 }}>
          {err ? <div style={{ padding: 16 }}><Notice kind="bad">{errText(t, err)}</Notice></div>
            : !data ? <div style={{ padding: 16 }} className="stack-sm">{[1, 2, 3, 4].map((i) => <div key={i} className="skel" style={{ height: 44 }} />)}</div>
              : tab === 'akun' ? (
                data.daftarAkun.length ? (
                  <table className="table">
                    <thead><tr><th>{t('auth.name')}</th><th className="hide-sm">{t('auth.email')}</th><th>{t('admin.role')}</th><th>{t('admin.status')}</th></tr></thead>
                    <tbody>
                      {data.daftarAkun.map((a) => (
                        <tr key={a.idRelawan} aria-selected={sel === a.idRelawan} tabIndex={0} onClick={() => setSel(a.idRelawan)} onKeyDown={(e) => { if (e.key === 'Enter') setSel(a.idRelawan); }}>
                          <td><b>{a.nama}</b><div className="muted small">{a.kode}{a.namaKomunitas ? ` · ${a.namaKomunitas}` : ''}</div></td>
                          <td className="hide-sm">{a.email}</td>
                          <td>{t(`role.${a.peran}`)}</td>
                          <td><Mark status={a.statusAkun} prefix="akun" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <Empty title={t('common.none')} />
              ) : (
                <table className="table">
                  <thead><tr><th>{t('admin.cname')}</th><th className="hide-sm">{t('admin.cregion')}</th><th className="num">{t('lb.members')}</th></tr></thead>
                  <tbody>
                    {data.daftarKomunitas.map((k) => (
                      <tr key={k.idKomunitas} aria-selected={sel === k.idKomunitas} tabIndex={0} onClick={() => setSel(k.idKomunitas)} onKeyDown={(e) => { if (e.key === 'Enter') setSel(k.idKomunitas); }}>
                        <td><b>{k.namaKomunitas}</b>{k.terverifikasi ? <ShieldCheck size={14} color="var(--sehat-ink)" style={{ marginLeft: 6, verticalAlign: -2 }} aria-label={t('admin.cverified')} /> : null}<div className="muted small">{k.kode}</div></td>
                        <td className="hide-sm">{k.wilayah}</td>
                        <td className="num">{k.jumlahAnggota}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
        </section>
        <section className="card split-detail">
          {sel ? <button type="button" className="btn btn-quiet btn-sm back-sm" onClick={() => setSel(null)}><ArrowLeft size={16} aria-hidden="true" />{t('common.back')}</button> : null}
          {!sel ? <Empty title={t('admin.pick')} />
            : tab === 'akun' ? <AkunForm id={sel} onSaved={load} />
              : <KomunitasForm id={sel} onSaved={(id) => { load(); setSel(id); }} />}
        </section>
      </div>
    </div>
  );
}
