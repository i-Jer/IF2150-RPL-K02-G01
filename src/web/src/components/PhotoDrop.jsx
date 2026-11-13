import { useId, useRef, useState } from 'react';
import { Camera, MapPin, MapPinOff, ImagePlus } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';
import { siapkanFoto } from '../lib/device.js';
import { Spinner } from './ui.jsx';

/** Upload box (I01-01, I04-02/03). Validates, reads EXIF and compresses before handing the photo up. */
export function PhotoDrop({ label, value, onChange, onError, hint, capture = true }) {
  const { t } = useI18n();
  const id = useId();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pilih(file) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await siapkanFoto(file));
    } catch (e) {
      onChange(null);
      onError?.(errText(t, { code: e.code || 'PHOTO_FORMAT' }));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="field">
      <span className="label" id={`${id}-l`}>{label}</span>
      <label htmlFor={id} className={`drop ${value ? 'has' : ''}`} aria-labelledby={`${id}-l`}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pilih(e.dataTransfer.files?.[0]); }}>
        {busy ? <Spinner size={26} /> : value ? (
          <>
            <img src={value.preview} alt="" />
            <span className="meta">
              {value.exif?.lat != null
                ? <span className="pill"><MapPin size={13} aria-hidden="true" />{t('report.photo.exif')}</span>
                : <span className="pill"><MapPinOff size={13} aria-hidden="true" />{t('report.photo.noexif')}</span>}
              <span className="pill">{(value.file.size / 1024 / 1024).toFixed(1)} MB</span>
            </span>
          </>
        ) : (
          <>
            {capture ? <Camera size={30} color="#0b3c5d" aria-hidden="true" /> : <ImagePlus size={30} color="#0b3c5d" aria-hidden="true" />}
            <span className="ttl">{t('report.photo.pick')}</span>
            <span className="hint">{hint || t('report.photo.hint')}</span>
          </>
        )}
      </label>
      <input ref={input} id={id} type="file" accept="image/jpeg,image/png" hidden
        {...(capture ? { capture: 'environment' } : {})} onChange={(e) => pilih(e.target.files?.[0])} />
    </div>
  );
}
