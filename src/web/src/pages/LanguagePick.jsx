import { useEffect, useState } from 'react';
import { warnaStatusBar } from '../lib/platform.js';
import { Check } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { strings } from '../i18n/strings.js';

/** First launch: pick a language (English is preselected). */
export function LanguagePick() {
  const { setLang } = useI18n();
  useEffect(() => { warnaStatusBar(true); }, []);
  const [pick, setPick] = useState((navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en');
  const s = strings[pick];
  return (
    <div className="langpick deep">
      <div className="langpick-in">
        <img src="/logo.svg" alt="SeaGuard" width="72" height="72" />
        <h1>{s['lang.pick.title']}</h1>
        <p className="sub">{s['lang.pick.body']}</p>
        <div className="langpick-opts" role="radiogroup" aria-label={s['lang.pick.title']}>
          {['en', 'id'].map((l) => (
            <button key={l} type="button" role="radio" aria-checked={pick === l} className={`langopt ${pick === l ? 'on' : ''}`} onClick={() => setPick(l)}>
              <span className="stencil">{l.toUpperCase()}</span>
              <span>{strings[l]['lang.name']}</span>
              {pick === l ? <Check size={20} aria-hidden="true" /> : <span style={{ width: 20 }} />}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-light btn-lg btn-block" onClick={() => setLang(pick)}>{s['lang.pick.go']}</button>
      </div>
    </div>
  );
}
