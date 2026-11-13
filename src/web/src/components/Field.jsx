import { Children, cloneElement, isValidElement, useCallback, useState } from 'react';
import { AlertCircle, Check, Circle } from 'lucide-react';
import { useI18n, errText } from '../i18n/index.jsx';

/**
 * Which form field a server error code belongs to. Forms pass their own field ids, keyed by these names,
 * so the message lands under the input it is about instead of in a box at the bottom of the form.
 */
const KODE_FIELD = {
  NAME_INVALID: 'nama', EMAIL_INVALID: 'email', EMAIL_TAKEN: 'email', PASSWORD_WEAK: 'password', PASSWORD_WRONG: 'passwordLama',
  COMMUNITY_INVALID: 'komunitas', COMMUNITY_NOT_FOUND: 'komunitas',
  PHOTO_MISSING: 'foto', PHOTO_FORMAT: 'foto', PHOTO_TOO_LARGE: 'foto', LIMIT_FILE_SIZE: 'foto', UPLOAD_INVALID: 'foto',
  INDICATOR_INVALID: 'tingkat', COORD_REQUIRED: 'koordinat', COORD_INVALID: 'koordinat', OUTSIDE_INDONESIA: 'koordinat',
  DESCRIPTION_TOO_LONG: 'deskripsi', CLEANUP_DESC_SHORT: 'deskripsi', CLEANUP_DESC_LONG: 'deskripsi',
  PARTICIPANTS_INVALID: 'peserta', WEIGHT_INVALID: 'berat', GPS_MISSING: 'foto', GEOFENCE_OUTSIDE: 'foto',
  REASON_REQUIRED: 'alasan', REASON_TOO_LONG: 'alasan', ROLE_INVALID: 'peran', INSTITUTION_REQUIRED: 'instansi',
  COMMUNITY_NAME_INVALID: 'namaKomunitas', COMMUNITY_EXISTS: 'namaKomunitas', COMMUNITY_REGION_TOO_LONG: 'wilayah',
  COMMUNITY_DESC_TOO_LONG: 'deskripsiKomunitas',
};

/**
 * Field-level errors for one form. `tangkap(err)` routes a server/client error to its field when the form
 * has that field, otherwise keeps it as a form-level message. `pasang(name)` gives a <Field> its error.
 */
export function useFormErrors(fieldIds) {
  const { t } = useI18n();
  const [errs, setErrs] = useState({});
  const [umum, setUmum] = useState(null);
  const tangkap = useCallback((err) => {
    const field = err?.details?.field && fieldIds[err.details.field] ? err.details.field : KODE_FIELD[err?.code];
    if (field && fieldIds[field]) {
      setErrs({ [field]: errText(t, err) }); setUmum(null);
      setTimeout(() => document.getElementById(fieldIds[field])?.focus({ preventScroll: false }), 30);
    } else { setErrs({}); setUmum(err); }
  }, [fieldIds, t]);
  const setField = useCallback((field, pesan) => setErrs((e) => ({ ...e, [field]: pesan })), []);
  const hapus = useCallback((field) => setErrs((e) => { if (!e[field]) return e; const n = { ...e }; delete n[field]; return n; }), []);
  const reset = useCallback(() => { setErrs({}); setUmum(null); }, []);
  return { errs, umum, tangkap, setField, hapus, reset, setUmum };
}

/**
 * Label, control, optional hint and the field's own error directly under it. The control gets
 * aria-invalid and aria-describedby, so screen readers announce the error with the field.
 */
export function Field({ id, label, hint, error, optional, children, className = '' }) {
  const { t } = useI18n();
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') || undefined;
  const kids = Children.map(children, (c) => (isValidElement(c) && c.props.id === id
    ? cloneElement(c, { 'aria-invalid': error ? true : undefined, 'aria-describedby': ids })
    : c));
  return (
    <div className={`field ${error ? 'has-err' : ''} ${className}`}>
      {label ? <label htmlFor={id}>{label}{optional ? <span className="opt"> · {t('common.optional')}</span> : null}</label> : null}
      {kids}
      {hint && !error ? <span className="hint" id={`${id}-hint`}>{hint}</span> : null}
      {error ? <p className="field-err" id={`${id}-err`} role="alert"><AlertCircle size={15} aria-hidden="true" />{error}</p> : null}
    </div>
  );
}

/** A field's error when the control is a group (photo drop, radio set, chips) rather than one input. */
export function FieldError({ id, error }) {
  if (!error) return null;
  return <p className="field-err" id={id} role="alert"><AlertCircle size={15} aria-hidden="true" />{error}</p>;
}

/** Shown next to the submit button: which fields still need attention, each one a link to that field. */
export function FormSummary({ errs, labels, ids }) {
  const { t } = useI18n();
  const keys = Object.keys(errs || {}).filter((k) => errs[k]);
  if (!keys.length) return null;
  return (
    <div className="form-summary" role="status">
      <AlertCircle size={17} aria-hidden="true" />
      <span>{t(keys.length === 1 ? 'form.check1' : 'form.checkN', { n: keys.length })}{' '}
        {keys.map((k, i) => (
          <span key={k}>{i ? ', ' : ''}<a href={`#${ids[k]}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(ids[k]); el?.scrollIntoView({ block: 'center', behavior: 'smooth' }); el?.focus({ preventScroll: true }); }}>{labels[k]}</a></span>
        ))}
      </span>
    </div>
  );
}

/** The password rules, checked live as the user types (the same rules the server enforces). */
export const aturanPassword = (pw) => ({ panjang: pw.length >= 8, huruf: /[A-Za-z]/.test(pw), angka: /\d/.test(pw) });
export const passwordValid = (pw) => Object.values(aturanPassword(pw)).every(Boolean);
export function PasswordRules({ id, value }) {
  const { t } = useI18n();
  const r = aturanPassword(value || '');
  return (
    <ul className="pw-rules" id={id} aria-live="polite">
      {[['panjang', 'pw.rule.length'], ['huruf', 'pw.rule.letter'], ['angka', 'pw.rule.number']].map(([k, label]) => (
        <li key={k} className={r[k] ? 'ok' : ''}>
          {r[k] ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
          <span>{t(label)}</span><span className="sr-only">{r[k] ? t('pw.rule.met') : t('pw.rule.notMet')}</span>
        </li>
      ))}
    </ul>
  );
}
