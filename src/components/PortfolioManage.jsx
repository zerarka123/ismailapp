import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { prepareImage, publicUrl, removeFiles, uploadImages } from '../lib/images';
import { canUsePortfolio, isLivePro } from '../lib/accountTypes';
import { isMissingSchema } from '../lib/format';
import { marsaError } from '../lib/marsaErrors';
import { errorText } from '../errors';
import { VIDEO_CATEGORIES } from './ProfileTabs.jsx';
import Icon from './Icon.jsx';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488', line: '#cfe6f5', red: '#b3261e' };
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB (Supabase Free plan limit)
const MAX_SECONDS = 180;
const MAX_VIDEOS = 20;
const MAX_PHOTOS = 30; // same limit as the portfolio_photos trigger (migration 003)

const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '13px 16px',
  borderRadius: 16,
  border: `2px solid ${C.line}`,
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: 15,
  color: C.navy,
};

const card = { background: '#fff', borderRadius: 24, padding: 18, boxShadow: '0 6px 24px rgba(10,110,184,.08)' };

// Reads duration and grabs a poster frame (best effort; never blocks the upload)
function inspectVideo(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let duration = null;
    let finished = false;
    const finish = (thumb) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve({ duration, thumb });
    };
    const timer = setTimeout(() => finish(null), 8000);
    v.preload = 'metadata';
    v.muted = true;
    v.playsInline = true;
    v.onerror = () => finish(null);
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) duration = Math.max(1, Math.round(v.duration));
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
    };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 640 / (v.videoWidth || 640));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((v.videoWidth || 640) * scale);
        canvas.height = Math.round((v.videoHeight || 360) * scale);
        canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => finish(b), 'image/jpeg', 0.75);
      } catch {
        finish(null);
      }
    };
    v.src = url;
  });
}

function Photos({ user, pro }) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('portfolio_photos').select('id, storage_path, caption').eq('professional_id', pro.id).order('created_at', { ascending: false });
    if (error && isMissingSchema(error)) return setUnavailable(true);
    setPhotos(data ?? []);
  }, [pro.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (unavailable) return <p className="msg info">{t('pf.photos_need_migration')}</p>;

  async function onPick(e) {
    const files = [...e.target.files].slice(0, Math.max(0, MAX_PHOTOS - (photos?.length ?? 0)));
    e.target.value = '';
    setMsg(null);
    if (!files.length) return setMsg({ ok: false, text: t('err.photo_limit') });
    setBusy(true);
    const uploaded = [];
    try {
      const blobs = [];
      for (const f of files) blobs.push(await prepareImage(f));
      await uploadImages('pro-images', `${user.id}/${pro.id}/portfolio`, blobs, uploaded);
      const { error } = await supabase.from('portfolio_photos').insert(
        uploaded.map((p) => ({ owner_id: user.id, professional_id: pro.id, storage_path: p, caption: caption.trim().slice(0, 120) || null }))
      );
      if (error) throw error;
      setCaption('');
      setMsg({ ok: true, text: t('pf.photos_added', { n: uploaded.length }) });
      await load();
    } catch (err) {
      if (uploaded.length) await removeFiles('pro-images', uploaded);
      setMsg({ ok: false, text: marsaError(err, errorText(err)) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(ph) {
    if (!window.confirm(t('pf.confirm_delete_photo'))) return;
    await removeFiles('pro-images', [ph.storage_path]);
    const { error } = await supabase.from('portfolio_photos').delete().eq('id', ph.id);
    if (error) setMsg({ ok: false, text: errorText(error) });
    else load();
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input style={input} placeholder={t('pf.caption')} value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} />
      <label className="btn alt" style={{ cursor: busy ? 'default' : 'pointer' }}>
        <Icon name="camera" />{busy ? t('pf.uploading') : t('pf.add_photos')}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={busy} onChange={onPick} />
      </label>
      {msg && <p role="status" style={{ margin: 0, fontSize: 14, color: msg.ok ? '#1b7a3d' : C.red }}>{msg.text}</p>}
      <div style={{ color: C.muted, fontSize: 13 }}>{t('pf.photos_count', { n: photos?.length ?? 0, max: MAX_PHOTOS })}</div>
      {photos === null && <p style={{ color: C.muted }}>{t('common.loading')}</p>}
      <div className="pgrid">
        {photos?.map((ph) => (
          <div key={ph.id} className="pgrid-item" style={{ backgroundImage: `url("${publicUrl('pro-images', ph.storage_path)}")` }}>
            <button type="button" className="thumb-x" onClick={() => onDelete(ph)} aria-label={t('img.remove')}><Icon name="x" size={14} /></button>
            {ph.caption && <span>{ph.caption}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PortfolioManage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const { user, profile, loading } = useAuth();
  const [pro, setPro] = useState(undefined);
  const [videos, setVideos] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('shipbuilding');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('professional_profiles').select('id, status, subscription_ends_at, business_name').eq('owner_id', user.id).maybeSingle().then(({ data }) => setPro(data ?? null));
  }, [user?.id]);

  const loadVideos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('portfolio_videos')
      .select('id, title, category, video_path, thumbnail_path')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setVideos(data ?? []);
  }, [user]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  if (loading || (user && pro === undefined)) return <p style={{ textAlign: 'center', marginTop: 60, color: C.muted }}>{t('common.loading')}</p>;

  if (!user)
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>{t('pf.login')}</p>
        <Link className="btn" to={`/login?next=${encodeURIComponent('/portfolio')}`}>{t('login.title')}</Link>
      </div>
    );

  const allowed = canUsePortfolio(profile) || isLivePro(pro);
  if (!allowed)
    return (
      <div style={{ padding: 24, textAlign: 'center', lineHeight: 1.9 }}>
        <p>{t('err.portfolio_not_allowed')}</p>
        <Link className="btn" to={pro ? '/register-business' : '/'}>{pro ? t('acc.my_business') : t('common.home')}</Link>
      </div>
    );

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (title.trim().length < 3) return setMsg({ ok: false, text: t('pf.title_short') });
    if (!file) return setMsg({ ok: false, text: t('pf.pick_video') });
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) return setMsg({ ok: false, text: t('pf.video_type') });
    if (file.size > MAX_SIZE) return setMsg({ ok: false, text: t('pf.video_too_big') });
    if ((videos?.length ?? 0) >= MAX_VIDEOS) return setMsg({ ok: false, text: t('pf.video_limit', { n: MAX_VIDEOS }) });

    setBusy(true);
    const uploaded = [];
    try {
      const { duration, thumb } = await inspectVideo(file);
      if (duration && duration > MAX_SECONDS) throw new Error('err.video_too_long');

      const id = crypto.randomUUID();
      const ext = file.type === 'video/quicktime' ? 'mov' : 'mp4';
      const videoPath = `${user.id}/${id}.${ext}`;
      const store = supabase.storage.from('portfolio-videos');

      const up = await store.upload(videoPath, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      uploaded.push(videoPath);

      let thumbPath = null;
      if (thumb) {
        const p = `${user.id}/${id}.jpg`;
        const tr = await store.upload(p, thumb, { contentType: 'image/jpeg', upsert: false });
        if (!tr.error) {
          thumbPath = p;
          uploaded.push(p);
        }
      }

      const { error } = await supabase.from('portfolio_videos').insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        video_path: videoPath,
        thumbnail_path: thumbPath,
        duration_seconds: duration,
      });
      if (error) throw error;

      setTitle('');
      setDescription('');
      setFile(null);
      setMsg({ ok: true, text: t('pf.video_added') });
      await loadVideos();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from('portfolio-videos').remove(uploaded);
      setMsg({ ok: false, text: marsaError(err, t('pf.video_failed')) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(v) {
    if (!window.confirm(t('pf.confirm_delete_video'))) return;
    const paths = [v.video_path, v.thumbnail_path].filter(Boolean);
    await supabase.storage.from('portfolio-videos').remove(paths);
    const { error } = await supabase.from('portfolio_videos').delete().eq('id', v.id);
    if (error) setMsg({ ok: false, text: marsaError(error) });
    else loadVideos();
  }

  return (
    <div style={{ padding: '16px 16px 120px', maxWidth: 720, margin: '0 auto' }}>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('pf.title')}</h2>
      </div>
      <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.8 }}>{t('pf.intro')}</p>
      {pro && <Link className="linkbtn" to={`/pro/${pro.id}`}>{t('pf.view_public')}</Link>}

      <h2 style={{ fontSize: 17, color: C.navy, margin: '20px 0 10px' }}>{t('tabs.photos')}</h2>
      {pro ? <Photos user={user} pro={pro} /> : <p className="msg info">{t('pf.photos_need_business')}</p>}

      <h2 style={{ fontSize: 17, color: C.navy, margin: '24px 0 10px' }}>{t('tabs.videos')}</h2>
      <form onSubmit={onSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={input} placeholder={t('pf.video_title')} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <select style={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {VIDEO_CATEGORIES.map((v) => (
            <option key={v} value={v}>{t(`vcat.${v}`)}</option>
          ))}
        </select>
        <textarea style={{ ...input, minHeight: 80 }} placeholder={t('pf.video_desc')} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />

        <label style={{ ...input, borderStyle: 'dashed', borderColor: C.blue, color: C.blue, fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>
          {file ? `${file.name} (${(file.size / 1048576).toFixed(1)} ${t('unit.mb')})` : t('pf.pick_video_hint')}
          <input type="file" accept="video/mp4,video/quicktime" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        {msg && <p role="status" style={{ margin: 0, fontSize: 14, color: msg.ok ? '#1b7a3d' : C.red }}>{msg.text}</p>}

        <button
          type="submit"
          disabled={busy}
          style={{ padding: '14px 16px', borderRadius: 999, border: 'none', background: busy ? '#9cc3df' : C.blue, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? t('pf.uploading_video') : t('pf.add_video')}
        </button>
      </form>

      <h2 style={{ fontSize: 17, color: C.navy, margin: '24px 0 10px' }}>
        {t('pf.my_videos')} {videos ? `(${videos.length}/${MAX_VIDEOS})` : ''}
      </h2>

      {videos === null && <p style={{ color: C.muted }}>{t('common.loading')}</p>}
      {videos && videos.length === 0 && <p style={{ color: C.muted }}>{t('pf.no_videos')}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {videos?.map((v) => (
          <div key={v.id} style={{ ...card, display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
            {v.thumbnail_path ? (
              <img src={publicUrl('portfolio-videos', v.thumbnail_path)} alt="" style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 12, background: '#000' }} />
            ) : (
              <div style={{ width: 96, height: 64, borderRadius: 12, background: '#0f2a44' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.navy, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{t(`vcat.${VIDEO_CATEGORIES.includes(v.category) ? v.category : 'other'}`)}</div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(v)}
              style={{ border: `2px solid ${C.line}`, background: '#fff', color: C.red, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
