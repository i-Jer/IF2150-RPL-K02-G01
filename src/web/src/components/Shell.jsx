import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { Map, MapPinPlus, Recycle, Trophy, Bell, ClipboardCheck, Images, Users, UserRound, LogIn, Download } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../api/auth.jsx';
import { onLive } from '../api/live.js';
import { isNative } from '../lib/platform.js';
import { useToast } from './ui.jsx';

export function navItems(akun) {
  if (akun && akun.peran !== 'Relawan') {
    return [
      { to: '/verifikasi/laporan', key: 'nav.verifyReports', short: 'nav.queue', icon: ClipboardCheck },
      { to: '/verifikasi/pembersihan', key: 'nav.verifyCleanups', short: 'nav.cleanups', icon: Images },
      { to: '/admin', key: 'nav.admin', short: 'nav.admin', icon: Users },
      { to: '/peta', key: 'nav.map', short: 'nav.map', icon: Map },
    ];
  }
  return [
    { to: '/peta', key: 'nav.map', short: 'nav.map', icon: Map },
    { to: '/lapor', key: 'nav.report', short: 'nav.report', icon: MapPinPlus },
    { to: '/pembersihan', key: 'nav.cleanup', short: 'nav.cleanup', icon: Recycle },
    { to: '/leaderboard', key: 'nav.leaderboard', short: 'nav.leaderboard', icon: Trophy },
  ];
}

export function Shell() {
  const { t } = useI18n();
  const { akun, unread } = useAuth();
  const toast = useToast();
  const loc = useLocation();
  const items = navItems(akun);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Real-time in-app notification (KF11): toast with the translated title.
  useEffect(() => onLive('notifikasi', (n) => {
    if (!n) return;
    const d = n.data || {};
    const title = t(`notif.${n.jenis}`, d);
    const bodyKey = `notif.${n.jenis}.b`;
    const body = t(bodyKey, d) !== bodyKey ? t(bodyKey, d) : (d.catatan || n.pesan);
    toast({ title: title.startsWith('notif.') ? n.judul : title, body, kind: n.jenis.endsWith('ditolak') ? 'bad' : 'ok', ms: 7000 });
  }), [t, toast]);

  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const inisial = (akun?.nama || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
        <Link to={akun?.peran && akun.peran !== 'Relawan' ? '/verifikasi/laporan' : '/peta'} className="brand" aria-label="SeaGuard">
          <img src="/logo.svg" alt="" width="30" height="30" />
          <span>SeaGuard</span>
        </Link>
        <nav className="nav" aria-label={t('a11y.main')}>
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>{t(i.key)}</NavLink>
          ))}
        </nav>
        <div className="top-actions">
          {!isNative && !akun ? (
            <Link className="btn btn-sm btn-ghost top-dl" to="/unduh"><Download size={16} aria-hidden="true" />{t('nav.download')}</Link>
          ) : null}
          {akun ? (
            <>
              <Link to="/notifikasi" className="iconbtn" aria-label={`${t('nav.notifications')}${unread ? ` (${unread})` : ''}`}>
                <Bell size={22} aria-hidden="true" />
                {unread ? <span className="count">{unread > 99 ? '99+' : unread}</span> : null}
              </Link>
              <Link to="/profil" className="me" aria-label={t('nav.profile')}>
                <span className="avatar" aria-hidden="true">{inisial}</span>
                <span className="who"><b>{akun.nama.split(' ')[0]}</b><small>{t(`role.${akun.peran}`)}</small></span>
              </Link>
            </>
          ) : akun === null ? (
            <Link to="/masuk" className="btn btn-sm btn-ghost"><LogIn size={16} aria-hidden="true" />{t('nav.signin')}</Link>
          ) : null}
        </div>
        </div>
      </header>
      {!online ? <div className="notice warn" style={{ borderRadius: 0 }}>{t('common.offline')}</div> : null}
      <main className="main" id="main"><Outlet /></main>
      <nav className="tabbar" aria-label={t('a11y.main')} style={{ '--tabs': items.length + 1 }}>
        {items.map((i) => {
          const Icon = i.icon;
          return (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={22} aria-hidden="true" />{t(i.short)}
            </NavLink>
          );
        })}
        <NavLink to={akun ? '/profil' : '/masuk'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <UserRound size={22} aria-hidden="true" />{akun ? t('nav.more') : t('nav.signin')}
        </NavLink>
      </nav>
    </div>
  );
}
