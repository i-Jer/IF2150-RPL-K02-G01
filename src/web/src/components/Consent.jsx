import { useI18n } from '../i18n/index.jsx';
import { api } from '../api/client.js';
import { Dialog } from './ui.jsx';

/** I-02: consent for location and camera (KF05), recorded server-side (KNF02). */
export function ConsentDialog({ onDone }) {
  const { t } = useI18n();
  const putuskan = async (keputusan) => {
    try { await api.post('/auth/consent', { jenis: 'lokasi_kamera', keputusan }); } catch { /* still respect the choice locally */ }
    onDone(keputusan === 'Izinkan');
  };
  return (
    <Dialog
      title={t('consent.title')}
      onClose={() => putuskan('Tolak')}
      actions={(
        <>
          <button type="button" className="btn btn-ghost" onClick={() => putuskan('Tolak')}>{t('consent.deny')}</button>
          <button type="button" className="btn btn-primary" onClick={() => putuskan('Izinkan')}>{t('consent.allow')}</button>
        </>
      )}
    >
      <p className="muted" style={{ lineHeight: 1.6 }}>{t('consent.body')}</p>
    </Dialog>
  );
}
