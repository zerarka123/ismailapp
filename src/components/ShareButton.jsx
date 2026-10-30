import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/index.jsx';
import { APP_URL } from '../config';
import Icon from './Icon.jsx';

// Share a listing or a business page. Uses the phone's share sheet when the browser has one;
// otherwise (e.g. inside the Android app WebView) shows WhatsApp / Facebook / Telegram / copy link.
export default function ShareButton({ path, title, solo = false }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${APP_URL}${path}`;
  const text = t('share.text', { title });

  async function onClick() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return; // the user closed the share sheet
      }
    }
    setCopied(false);
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
  }

  const enc = encodeURIComponent;
  const targets = [
    ['WhatsApp', `https://wa.me/?text=${enc(`${text} ${url}`)}`, 'wa'],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, 'fb'],
    ['Telegram', `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, 'tg'],
  ];

  return (
    <>
      <button type="button" className={`sharebtn${solo ? ' solo' : ''}`} onClick={onClick} aria-label={t('share.button')}>
        <Icon name="share" size={18} />
        <span>{t('share.button')}</span>
      </button>
      {open &&
        createPortal(
          <div className="share-overlay" onClick={() => setOpen(false)}>
            <div className="share-sheet" role="dialog" aria-modal="true" aria-label={t('share.button')} onClick={(e) => e.stopPropagation()}>
              <div className="row-between">
                <b>{t('share.button')}</b>
                <button type="button" className="linkbtn" onClick={() => setOpen(false)} aria-label={t('common.close')}><Icon name="x" /></button>
              </div>
              <div className="share-targets">
                {targets.map(([name, href, cls]) => (
                  <a key={name} className={`share-target ${cls}`} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{name}</a>
                ))}
              </div>
              <div className="share-link">
                <input className="input" readOnly value={url} dir="ltr" onFocus={(e) => e.target.select()} />
                <button type="button" className="btn sm" onClick={copy}>{copied ? `✓ ${t('share.copied')}` : t('share.copy')}</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
