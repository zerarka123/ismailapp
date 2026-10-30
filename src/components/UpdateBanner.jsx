import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { applyUpdate, onUpdateReady } from '../lib/appUpdate';

// Shown only when a new version arrives while the user is on a form page
export default function UpdateBanner() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  useEffect(() => onUpdateReady(() => setReady(true)), []);
  if (!ready) return null;
  return (
    <div className="update-banner" role="status">
      <span>{t('update.available')}</span>
      <button type="button" className="btn sm" onClick={applyUpdate}>{t('update.now')}</button>
    </div>
  );
}
