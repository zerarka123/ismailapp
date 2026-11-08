import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import { fmtDate, isMissingSchema } from '../lib/format';
import { MAX_ANNOUNCEMENT_VIDEO_BYTES } from '../config';
import {
  AUDIENCE_KEYS,
  VIDEO_TYPES,
  audienceLabel,
  audienceText,
  checkVideo,
  removeAnnouncementMedia,
  sendAnnouncement,
  uploadAnnouncementMedia,
} from '../lib/announcements';
import { AnnouncementBody } from './AnnouncementView.jsx';
import Icon from './Icon.jsx';

const EMPTY = { title: '', body: '', media: 'none', file: null, link: '' };
const MEDIA_OPTIONS = ['none', 'image', 'video_file', 'video_link'];
const STATUS_TONE = { sent: 'ok', sending: 'warn', failed: 'bad' };
const isHttps = (u) => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};
const mb = (bytes) => Math.round(bytes / (1024 * 1024));

// Admin tab "الإعلانات": write → preview → confirm → send (Edge Function send-announcement) → report + history
export default function AdminAnnouncements() {
  const { t } = useI18n();
  const [f, setF] = useState(EMPTY);
  const [audience, setAudience] = useState(['all']);
  const [reach, setReach] = useState(null);
  const [step, setStep] = useState('edit'); // edit | confirm | sending
  const [progress, setProgress] = useState('');
  const [msg, setMsg] = useState(null);
  const [history, setHistory] = useState(null);
  const [missing, setMissing] = useState(false);
  const fileInput = useRef(null);

  // ---- history ----
  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, media_type, media_url, audience, created_at, status, recipients, devices, sent, failed, announcement_reads(count)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setMissing(isMissingSchema(error));
      return setHistory([]);
    }
    setHistory(data || []);
  }, []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ---- reach of the chosen audience ----
  useEffect(() => {
    let alive = true;
    setReach(null);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('admin_announcement_reach', { p_audience: audience });
      if (alive && !error) setReach(data);
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [audience]);

  // ---- local preview of the chosen file ----
  const [fileUrl, setFileUrl] = useState(null);
  useEffect(() => {
    if (!f.file) return setFileUrl(null);
    const u = URL.createObjectURL(f.file);
    setFileUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [f.file]);

  const preview = {
    title: f.title.trim() || t('ann.f_title'),
    body: f.body.trim(),
    media_type: f.media === 'image' ? 'image' : f.media.startsWith('video') ? 'video' : 'none',
    media_url: f.media === 'video_link' ? (isHttps(f.link.trim()) ? f.link.trim() : null) : fileUrl,
  };
  if (!preview.media_url) preview.media_type = 'none';
  // the local blob: URL is not recognised as a video file by its name, so the preview uses <video> directly
  const previewIsLocalVideo = f.media === 'video_file' && fileUrl;
  const pushBody = preview.body.replace(/\s+/g, ' ').slice(0, 140);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function pickMedia(m) {
    setMsg(null);
    setF({ ...f, media: m, file: null, link: m === 'video_link' ? f.link : '' });
    if (fileInput.current) fileInput.current.value = '';
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    setMsg(null);
    if (!file) return;
    if (f.media === 'video_file') {
      try {
        checkVideo(file);
      } catch (err) {
        e.target.value = '';
        return setMsg({ type: 'err', text: err.message === 'ann_video_big' ? t('ann.v_video_big', { max: mb(MAX_ANNOUNCEMENT_VIDEO_BYTES), size: mb(file.size) }) : t('ann.v_video_type') });
      }
    } else if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      e.target.value = '';
      return setMsg({ type: 'err', text: t('err.bad_image_type') });
    }
    setF({ ...f, file });
  }

  function toggleAudience(k) {
    setAudience((cur) => {
      if (k === 'all') return ['all'];
      const rest = cur.filter((x) => x !== 'all');
      const next = rest.includes(k) ? rest.filter((x) => x !== k) : [...rest, k];
      return next.length ? next : ['all'];
    });
  }

  function validate() {
    const title = f.title.trim();
    if (title.length < 2 || title.length > 80) return t('ann.v_title');
    if (f.body.trim().length > 2000) return t('ann.v_body');
    if ((f.media === 'image' || f.media === 'video_file') && !f.file) return t('ann.v_file');
    if (f.media === 'video_link' && !isHttps(f.link.trim())) return t('ann.v_link');
    return null;
  }

  function askConfirm() {
    setMsg(null);
    const err = validate();
    if (err) return setMsg({ type: 'err', text: err });
    setStep('confirm');
  }

  async function send() {
    setStep('sending');
    setMsg(null);
    let uploadedUrl = null;
    try {
      let mediaType = 'none';
      let mediaUrl = null;
      if (f.media === 'image' || f.media === 'video_file') {
        setProgress(t('ann.uploading'));
        const kind = f.media === 'image' ? 'image' : 'video';
        const up = await uploadAnnouncementMedia(kind, f.file);
        uploadedUrl = up.url;
        mediaType = kind;
        mediaUrl = up.url;
      } else if (f.media === 'video_link') {
        mediaType = 'video';
        mediaUrl = f.link.trim();
      }
      setProgress(t('ann.sending'));
      const res = await sendAnnouncement({ title: f.title.trim(), body: f.body.trim(), media_type: mediaType, media_url: mediaUrl, audience });
      if (res.error !== undefined) {
        // nothing was saved: remove the uploaded file. (If the announcement was saved but sending failed, keep it.)
        if (res.error !== 'send_failed' && uploadedUrl) await removeAnnouncementMedia(uploadedUrl);
        throw Object.assign(new Error(res.error || res.raw?.message || ''), { code: res.error });
      }
      const r = res.data || {};
      setMsg({ type: 'ok', text: t('ann.sent_report', { sent: r.sent ?? 0, devices: r.devices ?? 0, users: r.recipients ?? 0, failed: r.failed ?? 0 }) });
      setF(EMPTY);
      if (fileInput.current) fileInput.current.value = '';
      setStep('edit');
      loadHistory();
    } catch (err) {
      const code = err.code || err.message;
      const text =
        code === 'not_admin' || code === 'not_authenticated' ? t('err.no_permission')
        : code === 'ann_video_big' ? t('ann.v_video_big', { max: mb(MAX_ANNOUNCEMENT_VIDEO_BYTES), size: mb(f.file?.size || 0) })
        : code === 'ann_video_type' ? t('ann.v_video_type')
        : code === 'send_failed' ? t('ann.e_send_failed')
        : code === 'no_function' ? t('ann.e_no_function')
        : errorText(err);
      setMsg({ type: 'err', text });
      setStep('edit');
      loadHistory();
    } finally {
      setProgress('');
    }
  }

  async function remove(a) {
    if (!window.confirm(t('ann.confirm_delete', { title: a.title }))) return;
    const { error } = await supabase.from('announcements').delete().eq('id', a.id);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    await removeAnnouncementMedia(a.media_url);
    setMsg({ type: 'ok', text: t('ann.deleted') });
    loadHistory();
  }

  if (missing) return <p className="msg info">{t('ann.needs_migration')}</p>;

  const busy = step !== 'edit';
  return (
    <>
      <div className="box">
        <div className="section-title" style={{ marginTop: 0 }}><Icon name="megaphone" size={18} /> {t('ann.new_title')}</div>

        <div className="field">
          <label>{t('ann.f_title')}</label>
          <input className="input" dir="auto" value={f.title} onChange={set('title')} maxLength={80} disabled={busy} placeholder={t('ann.f_title_hint')} />
        </div>
        <div className="field">
          <label>{t('ann.f_body')}</label>
          <textarea className="input" dir="auto" value={f.body} onChange={set('body')} maxLength={2000} disabled={busy} />
          <small className="muted">{f.body.length}/2000 · {t('ann.f_body_help')}</small>
        </div>

        <div className="field">
          <label>{t('ann.f_media')}</label>
          <div className="chips wrap">
            {MEDIA_OPTIONS.map((m) => (
              <button key={m} type="button" className={`chip ${f.media === m ? 'on' : ''}`} onClick={() => pickMedia(m)} disabled={busy}>{t(`ann.media_${m}`)}</button>
            ))}
          </div>
          {(f.media === 'image' || f.media === 'video_file') && (
            <>
              <input
                ref={fileInput}
                className="input ann-file"
                type="file"
                accept={f.media === 'image' ? 'image/jpeg,image/png,image/webp' : VIDEO_TYPES.join(',')}
                onChange={onFile}
                disabled={busy}
              />
              <small className="muted">{f.media === 'image' ? t('ann.image_help') : t('ann.video_help', { max: mb(MAX_ANNOUNCEMENT_VIDEO_BYTES) })}</small>
            </>
          )}
          {f.media === 'video_link' && (
            <>
              <input className="input" dir="ltr" inputMode="url" value={f.link} onChange={set('link')} placeholder="https://youtu.be/…" disabled={busy} style={{ marginTop: 8 }} />
              <small className="muted">{t('ann.link_help')}</small>
            </>
          )}
        </div>

        <div className="field">
          <label>{t('ann.f_audience')}</label>
          <div className="chips wrap">
            {AUDIENCE_KEYS.map((k) => (
              <button key={k} type="button" className={`chip ${audience.includes(k) ? 'on' : ''}`} onClick={() => toggleAudience(k)} disabled={busy}>{audienceLabel(k)}</button>
            ))}
          </div>
          <small className="muted">
            {reach ? t('ann.reach', { users: reach.users, devices: (reach.android || 0) + (reach.web || 0), android: reach.android || 0, web: reach.web || 0 }) : t('common.loading')}
          </small>
        </div>
      </div>

      {/* ---- preview ---- */}
      <div className="section-title">{t('ann.preview')}</div>
      <div className="ann-push-preview">
        <img src="/icon-192.png" alt="" />
        <div>
          <b dir="auto">{preview.title}</b>
          {pushBody && <span dir="auto">{pushBody}{preview.body.length > 140 ? '…' : ''}</span>}
        </div>
        {preview.media_type === 'image' && <span className="ann-push-img" style={{ backgroundImage: `url("${preview.media_url}")` }} />}
      </div>
      <small className="muted">{t('ann.preview_push_help')}</small>
      <div className="box ann-preview">
        {previewIsLocalVideo ? (
          <div className="ann-body">
            <video className="ann-media" src={fileUrl} controls playsInline preload="metadata" />
            <h3 dir="auto">{preview.title}</h3>
            {preview.body && <p className="desc" dir="auto">{preview.body}</p>}
          </div>
        ) : (
          <AnnouncementBody a={preview} showDate={false} />
        )}
      </div>

      {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</p>}

      {step === 'edit' && (
        <button className="btn" style={{ marginTop: 12 }} onClick={askConfirm}><Icon name="megaphone" /> {t('ann.send')}</button>
      )}
      {step === 'confirm' && (
        <div className="box ann-confirm">
          <p>{t('ann.confirm', { title: f.title.trim(), audience: audienceText(audience), users: reach?.users ?? '…' })}</p>
          <div className="row2">
            <button className="btn" onClick={send}>{t('ann.confirm_yes')}</button>
            <button className="btn alt" onClick={() => setStep('edit')}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {step === 'sending' && <p className="msg info" style={{ marginTop: 12 }}>{progress || t('common.wait')}</p>}

      {/* ---- history ---- */}
      <div className="section-title">{t('ann.history')}</div>
      {history === null && <p className="muted center">{t('common.loading')}</p>}
      {history?.length === 0 && <p className="empty">{t('ann.history_empty')}</p>}
      {history?.map((a) => (
        <div key={a.id} className="box">
          <div className="admin-head">
            <b style={{ flex: 1, minWidth: 0 }} dir="auto">{a.title}</b>
            <span className={`pill ${STATUS_TONE[a.status] || ''}`}>{t(`ann.status_${a.status}`)}</span>
          </div>
          <div className="muted small">
            {fmtDate(a.created_at)} · {audienceText(a.audience)} · {t(`ann.mtype_${a.media_type}`)}
          </div>
          {a.status !== 'failed' && (
            <div className="muted small">
              {t('ann.stats', { sent: a.sent ?? 0, devices: a.devices ?? 0, users: a.recipients ?? 0, failed: a.failed ?? 0, seen: a.announcement_reads?.[0]?.count ?? 0 })}
            </div>
          )}
          <div className="mine-actions">
            <button className="mini danger" onClick={() => remove(a)}><Icon name="trash" size={13} /> {t('common.delete')}</button>
          </div>
        </div>
      ))}
    </>
  );
}
