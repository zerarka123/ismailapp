import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { errorText } from '../errors';
import { useI18n } from '../i18n/index.jsx';
import { cssUrl, prepareImage } from '../lib/images';

const ACCEPT = 'image/jpeg,image/png,image/webp';

// The ONE account photo of a business (round in the guide and on its page).
// Tapping the circle opens a small sheet: "take a photo" opens the camera directly (capture), "choose from photos"
// opens the phone's photo library. Works in the browser, the installed PWA and the Android app (the WebView hands
// the request to the phone's own camera / gallery apps, so the app needs no camera permission).
// value: { blob, url } | null (a new photo) · currentUrl: the photo already saved (edit page)
export default function AvatarPicker({ value, onChange, currentUrl = null }) {
  const { t } = useI18n();
  const cam = useRef(null);
  const lib = useRef(null);
  const sheetRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const shown = value?.url || currentUrl;

  useEffect(() => () => value?.url && URL.revokeObjectURL(value.url), [value?.url]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    sheetRef.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setOpen(false);
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const blob = await prepareImage(file);
      onChange({ blob, url: URL.createObjectURL(blob) });
    } catch (x) {
      setErr(errorText(x));
    }
    setBusy(false);
  }

  return (
    <div className="av-pick">
      <button
        type="button"
        className={`av-circle ${shown ? 'has' : ''}`}
        style={shown ? { backgroundImage: cssUrl(shown) } : undefined}
        onClick={() => setOpen(true)}
        disabled={busy}
        aria-label={shown ? t('av.change') : t('av.add')}
        aria-haspopup="dialog"
      >
        {!shown && <Icon name="camera" size={36} />}
        <span className="av-plus" aria-hidden="true"><Icon name={shown ? 'edit' : 'plus'} size={16} /></span>
      </button>
      <b>{busy ? t('common.wait') : t('av.title')}</b>
      <p>{t('av.help')}</p>
      {err && <p className="msg err" style={{ margin: 0 }}>{err}</p>}

      <input ref={cam} type="file" accept={ACCEPT} capture="environment" hidden onChange={onPick} />
      <input ref={lib} type="file" accept={ACCEPT} hidden onChange={onPick} />

      {open &&
        createPortal(
          <div className="av-sheet-bg" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className="av-sheet" role="dialog" aria-modal="true" aria-label={t('av.title')} ref={sheetRef}>
              <h2>{t('av.title')}</h2>
              <button type="button" className="av-opt" onClick={() => {
                  cam.current?.click();
                  setOpen(false);
                }}>
                <span aria-hidden="true"><Icon name="camera" /></span>
                <span><b>{t('av.camera')}</b><small>{t('av.camera_sub')}</small></span>
              </button>
              <button type="button" className="av-opt" onClick={() => {
                  lib.current?.click();
                  setOpen(false);
                }}>
                <span aria-hidden="true"><Icon name="image" /></span>
                <span><b>{t('av.library')}</b><small>{t('av.library_sub')}</small></span>
              </button>
              <button type="button" className="btn alt" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
