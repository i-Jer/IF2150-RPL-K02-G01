import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Trophy } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { api } from '../api/client.js';
import { onLive } from '../api/live.js';
import { Empty, Notice, Spinner } from '../components/ui.jsx';
import { fmtNum } from '../lib/platform.js';

/** One board row; a lit row stays amber until it has been in view for about a second. */
function LbRow({ id, lit, me, onSeen, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!lit || !ref.current) return undefined;
    let timer = null;
    const io = new IntersectionObserver(([e]) => { clearTimeout(timer); if (e.isIntersecting) timer = setTimeout(() => onSeen(id), 4000); }, { threshold: 0.9 });
    io.observe(ref.current);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, [lit, id, onSeen]);
  return <li ref={ref} className={['lb-row', lit ? 'lit' : '', me ? 'lb-me' : ''].join(' ')}>{children}</li>;
}

export default function Leaderboard() {
  const { t, lang } = useI18n();
  const { akun } = useAuth();
  const [jenis, setJenis] = useState('relawan');
  const [periode, setPeriode] = useState('semua');
  const [data, setData] = useState(null);
  const [posisi, setPosisi] = useState(null);
  const [state, setState] = useState('loading');
  const [lit, setLit] = useState(new Set());
  const prev = useRef(new Map());
  const seen = useCallback((id) => setLit((x) => { if (!x.has(id)) return x; const n = new Set(x); n.delete(id); return n; }), []);

  const muat = useCallback(async (live) => {
    if (!live) setState('loading');
    try {
      const [d, p] = await Promise.all([
        api.get(`/leaderboard/peringkat?jenis=${jenis}&periode=${periode}&limit=100`),
        api.get(`/leaderboard?periode=${periode}`),
      ]);
      if (live) {
        // KNF08: rows that moved stay lit until seen.
        const moved = new Set(d.daftar.filter((r) => prev.current.get(r.idRelawan || r.idKomunitas) !== r.peringkat).map((r) => r.idRelawan || r.idKomunitas));
        if (moved.size) setLit((x) => new Set([...x, ...moved]));
      }
      prev.current = new Map(d.daftar.map((r) => [r.idRelawan || r.idKomunitas, r.peringkat]));
      setData(d); setPosisi(p); setState('ok');
    } catch { setState('error'); }
  }, [jenis, periode]);
  useEffect(() => { muat(false); }, [muat]);
  useEffect(() => onLive('leaderboard', () => muat(true)), [muat]);

  const saya = akun?.idRelawan;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{t('lb.title')}</h1><p>{t('lb.body')}</p></div>
        <button type="button" className="btn btn-ghost" onClick={() => muat(false)} disabled={state === 'loading'}>
          {state === 'loading' ? <Spinner size={16} /> : <RefreshCw size={16} aria-hidden="true" />}{t('lb.reload')}
        </button>
      </div>

      <section className="board you" aria-label={t('lb.you')}>
        {!akun ? <p>{t('lb.signin')} <Link to="/masuk?ke=/leaderboard" style={{ color: 'var(--amber)' }}>{t('nav.signin')}</Link></p>
          : akun.peran !== 'Relawan' ? <p>{t('lb.notRanked')}</p>
            : posisi?.posisi ? (
              <>
                <span className="you-label">{t('lb.you')}</span>
                <span className="you-rank stencil">#{posisi.posisi.peringkat}</span>
                <span className="you-of">{t('lb.of', { n: posisi.posisi.dari })}</span>
                <span className="you-pts"><span className="stencil">{fmtNum(posisi.posisi.totalPoin, lang)}</span> {t('lb.points').toLowerCase()}</span>
              </>
            ) : <Spinner />}
      </section>

      <div className="lb-tools">
        <div className="seg" role="group" aria-label={t('lb.title')}>
          <button type="button" aria-pressed={jenis === 'relawan'} onClick={() => setJenis('relawan')}>{t('lb.volunteers')}</button>
          <button type="button" aria-pressed={jenis === 'komunitas'} onClick={() => setJenis('komunitas')}>{t('lb.communities')}</button>
        </div>
        {jenis === 'relawan' ? (
          <div className="seg" role="group" aria-label={t('a11y.period')}>
            {[['semua', 'lb.all'], ['bulan', 'lb.month'], ['minggu', 'lb.week']].map(([v, k]) => (
              <button key={v} type="button" aria-pressed={periode === v} onClick={() => setPeriode(v)}>{t(k)}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="board lb-board">
        {state === 'error' ? (
          <div style={{ padding: 20 }}>
            <Notice kind="bad">{t('lb.failed')}</Notice>
            <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => muat(false)}><RefreshCw size={16} aria-hidden="true" />{t('lb.reload')}</button>
          </div>
        ) : !data ? (
          <div style={{ padding: 20 }} className="stack-sm">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skel" style={{ height: 40, opacity: 0.15 }} />)}</div>
        ) : !data.daftar.length || data.daftar.every((r) => !r.totalPoin) ? (
          <Empty icon={Trophy} title={t('lb.empty')} />
        ) : (
          <>
            <div className="lb-head" role="presentation">
              <span>{t('lb.rank')}</span><span>{data.jenis === 'relawan' ? t('lb.volunteers') : t('lb.communities')}</span>
              <span className="hide-sm">{data.jenis === 'relawan' ? t('lb.cleanups') : t('lb.members')}</span><span>{t('lb.points')}</span>
            </div>
            <ol className="lb-rows">
              {data.daftar.map((r) => {
                const id = r.idRelawan || r.idKomunitas;
                return (
                  <LbRow key={id} id={id} lit={lit.has(id)} me={id === saya} onSeen={seen}>
                    <span className={`lb-rank stencil ${r.peringkat === 1 ? 'first' : ''}`}>{r.peringkat}</span>
                    <span className="lb-name"><b>{r.nama || r.namaKomunitas}</b>{id === saya ? <em className="lb-you">{t('lb.youTag')}</em> : null}
                      <small>{r.nama ? (r.namaKomunitas || '') : (r.wilayah || '')}</small></span>
                    <span className="lb-count hide-sm">{fmtNum(data.jenis === 'relawan' ? r.jumlahPembersihan : r.anggota, lang)}</span>
                    <span className="lb-pts stencil">{fmtNum(r.totalPoin, lang)}</span>
                  </LbRow>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
