import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, loadToken, setToken } from './client.js';
import { connectLive, onLive } from './live.js';
import { useI18n } from '../i18n/index.jsx';

const Auth = createContext(null);

export function AuthProvider({ children }) {
  const { setLang, rawLang } = useI18n();
  const [akun, setAkun] = useState(undefined); // undefined = loading, null = signed out
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/auth/saya');
      setAkun(r.akun);
      return r;
    } catch {
      setAkun(null);
      return null;
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    try { setUnread((await api.get('/notifikasi')).belumDibaca); } catch { /* signed out */ }
  }, []);

  useEffect(() => {
    loadToken().then(refresh).finally(connectLive);
    const off = () => setAkun(null);
    window.addEventListener('sg:unauthorized', off);
    return () => window.removeEventListener('sg:unauthorized', off);
  }, [refresh]);

  useEffect(() => {
    if (!akun) { setUnread(0); return undefined; }
    refreshUnread();
    const un = onLive('notifikasi', () => setUnread((n) => n + 1));
    const poll = setInterval(refreshUnread, 60000);
    return () => { un(); clearInterval(poll); };
  }, [akun, refreshUnread]);

  const masuk = useCallback(async (r) => {
    await setToken(r.token);
    setAkun(r.akun);
    // Language chosen on first launch wins; otherwise follow the account's saved language.
    if (rawLang === 'unset' && r.akun?.bahasa) setLang(r.akun.bahasa);
    connectLive();
  }, [rawLang, setLang]);

  const login = useCallback(async (email, password) => masuk(await api.post('/auth/login', { email, password })), [masuk]);
  const daftar = useCallback(async (data) => masuk(await api.post('/auth/daftar', data)), [masuk]);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } catch { /* ignore */ }
    await setToken(null);
    setAkun(null);
    connectLive();
  }, []);

  const value = useMemo(() => ({
    akun, setAkun, refresh, login, daftar, logout, unread, setUnread, refreshUnread,
    isRelawan: akun?.peran === 'Relawan',
    isVerifier: akun?.peran === 'Verifikator' || akun?.peran === 'Admin',
    isAdmin: akun?.peran === 'Admin',
  }), [akun, refresh, login, daftar, logout, unread, refreshUnread]);
  return <Auth.Provider value={value}>{children}</Auth.Provider>;
}

export const useAuth = () => useContext(Auth);
