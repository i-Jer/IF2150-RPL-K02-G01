import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { strings } from './strings.js';
import { store } from '../lib/platform.js';

const I18n = createContext(null);
export const LANGS = ['en', 'id'];

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(null); // null until loaded; 'unset' = first run
  useEffect(() => {
    store.get('sg.lang').then((v) => setLangState(LANGS.includes(v) ? v : 'unset'));
  }, []);
  const setLang = useCallback((l) => {
    setLangState(l);
    store.set('sg.lang', l);
  }, []);
  useEffect(() => {
    if (LANGS.includes(lang)) document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => {
    const L = LANGS.includes(lang) ? lang : 'en';
    const t = (key, vars) => {
      let s = strings[L][key] ?? strings.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    return { lang: L, rawLang: lang, setLang, t };
  }, [lang, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

/** Translate an API error object {code, message, details}. */
export function errText(t, err) {
  if (!err) return '';
  const key = `e.${err.code}`;
  const s = t(key, err.details || {});
  return s === key ? (err.message || t('common.error')) : s;
}
