import { useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { fmtDate } from '../lib/format';
import { isVideoFileUrl, videoEmbed } from '../lib/announcements';
import Icon from './Icon.jsx';

// Image / video of an announcement
export function AnnouncementMedia({ a, autoPlay = false }) {
  const { t } = useI18n();
  if (!a?.media_url || a.media_type === 'none') return null;
  if (a.media_type === 'image') return <img className="ann-media" src={a.media_url} alt="" loading="lazy" />;
  const embed = videoEmbed(a.media_url);
  if (embed) {
    return (
      <div className="ann-media ann-embed">
        <iframe src={embed} title={a.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
      </div>
    );
  }
  if (isVideoFileUrl(a.media_url)) {
    return <video className="ann-media" src={a.media_url} controls playsInline preload="metadata" autoPlay={autoPlay} muted={autoPlay} />;
  }
  return (
    <a className="btn alt ann-videolink" href={a.media_url} target="_blank" rel="noopener noreferrer">
      <Icon name="video" /> {t('ann.watch_video')}
    </a>
  );
}

// Title + media + text (used by the pop-up, the "What's new" list and the admin preview)
export function AnnouncementBody({ a, showDate = true }) {
  return (
    <div className="ann-body">
      <AnnouncementMedia a={a} />
      {/* dir="auto": the admin's text keeps its own direction (Arabic RTL) whatever the app language */}
      <h3 dir="auto">{a.title}</h3>
      {a.body && <p className="desc" dir="auto">{a.body}</p>}
      {showDate && a.created_at && <small className="muted">{fmtDate(a.created_at)}</small>}
    </div>
  );
}

// Centered pop-up. `onNext` shows a "next" button when more announcements are waiting.
export default function AnnouncementModal({ a, onClose, onNext }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!a) return null;
  return (
    <div className="ann-overlay" onClick={onClose}>
      <div className="ann-card" role="dialog" aria-modal="true" aria-label={a.title} onClick={(e) => e.stopPropagation()}>
        <div className="ann-head">
          <span className="pill"><Icon name="megaphone" size={14} /> {t('ann.badge')}</span>
          <button className="lb-btn ann-x" onClick={onClose} aria-label={t('common.close')}><Icon name="x" /></button>
        </div>
        <div className="ann-scroll">
          <AnnouncementBody a={a} />
        </div>
        <div className="ann-actions">
          {onNext ? (
            <>
              <button className="btn" onClick={onNext}>{t('ann.next')}</button>
              <button className="btn alt" onClick={onClose}>{t('common.close')}</button>
            </>
          ) : (
            <button className="btn" onClick={onClose}>{t('ann.ok')}</button>
          )}
        </div>
      </div>
    </div>
  );
}
