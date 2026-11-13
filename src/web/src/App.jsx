import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { AuthProvider, useAuth } from './api/auth.jsx';
import { ToastProvider, Spinner } from './components/ui.jsx';
import { Shell } from './components/Shell.jsx';
import { isNative, warnaStatusBar } from './lib/platform.js';
import { UpdateWatcher } from './components/UpdateWatcher.jsx';
import { siapkanUpdater } from './lib/updater.js';
import { LanguagePick } from './pages/LanguagePick.jsx';
import { Login, Register } from './pages/Auth.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Download = lazy(() => import('./pages/Download.jsx'));
const Heatmap = lazy(() => import('./pages/Heatmap.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));
const Cleanup = lazy(() => import('./pages/Cleanup.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const VerifyReports = lazy(() => import('./pages/VerifyReports.jsx'));
const VerifyCleanups = lazy(() => import('./pages/VerifyCleanups.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));

function Loading() {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', color: 'var(--mute)' }}><Spinner size={28} /></div>;
}

/** Route guard: signed in, optionally with a role. */
function Need({ role, children }) {
  const { akun } = useAuth();
  const loc = useLocation();
  if (akun === undefined) return <Loading />;
  if (!akun) return <Navigate to={`/masuk?ke=${encodeURIComponent(loc.pathname)}`} replace />;
  if (role === 'Relawan' && akun.peran !== 'Relawan') return <Navigate to="/verifikasi/laporan" replace />;
  if (role === 'Verifikator' && akun.peran === 'Relawan') return <Navigate to="/peta" replace />;
  return children;
}

function Home() {
  const { akun } = useAuth();
  if (!isNative) return <Landing />;
  if (akun === undefined) return <Loading />;
  if (!akun) return <Navigate to="/masuk" replace />;
  return <Navigate to={akun.peran === 'Relawan' ? '/peta' : '/verifikasi/laporan'} replace />;
}

/** Android hardware back button: go back inside the app, exit only from the first screen. */
const RUTE_GELAP = ['/', '/unduh', '/masuk', '/daftar'];

/** Keeps the status-bar icons readable on each route's ground. */
function StatusBarIcons() {
  const loc = useLocation();
  useEffect(() => { warnaStatusBar(RUTE_GELAP.includes(loc.pathname)); }, [loc.pathname]);
  return null;
}

function NativeBack() {
  const nav = useNavigate();
  useEffect(() => {
    if (!isNative) return undefined;
    siapkanUpdater(); // confirm this bundle booted, on every screen (otherwise the updater rolls back)
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) nav(-1); else CapApp.exitApp();
    });
    return () => { sub.then((s) => s.remove()).catch(() => {}); };
  }, [nav]);
  return null;
}

function Routed() {
  const { rawLang } = useI18n();
  if (rawLang === null) return <Loading />;
  // First launch (app and web): choose a language before anything else.
  if (rawLang === 'unset') return <LanguagePick />;
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/unduh" element={<Download />} />
        <Route path="/download" element={<Download />} />
        <Route path="/masuk" element={<Login />} />
        <Route path="/daftar" element={<Register />} />
        <Route element={<Shell />}>
          <Route path="/peta" element={<Heatmap />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/lapor" element={<Need role="Relawan"><Report /></Need>} />
          <Route path="/pembersihan" element={<Need role="Relawan"><Cleanup /></Need>} />
          <Route path="/notifikasi" element={<Need><Notifications /></Need>} />
          <Route path="/profil" element={<Need><Profile /></Need>} />
          <Route path="/laporan-saya" element={<Need><Profile tab="laporan" /></Need>} />
          <Route path="/verifikasi/laporan" element={<Need role="Verifikator"><VerifyReports /></Need>} />
          <Route path="/verifikasi/pembersihan" element={<Need role="Verifikator"><VerifyCleanups /></Need>} />
          <Route path="/admin" element={<Need role="Verifikator"><Admin /></Need>} />
          <Route path="/admin/log" element={<Need role="Verifikator"><AuditLog /></Need>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <NativeBack />
            <StatusBarIcons />
            <UpdateWatcher />
            <Routed />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
