import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { publicUrl } from '../lib/images';
import { canUsePortfolio } from '../lib/accountTypes';
import { arabicError } from '../lib/marsaErrors';

const C = { blue: '#0a6eb8', navy: '#0f2a44', muted: '#5b7488', line: '#cfe6f5', red: '#b3261e' };
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB (Supabase Free plan limit)
const MAX_SECONDS = 180;
const MAX_VIDEOS = 20;
const CATEGORIES = [
  ['shipbuilding', 'بناء سفن'],
  ['painting', 'طلاء'],
  ['maintenance', 'صيانة'],
  ['engine_test', 'اختبار محرك'],
  ['other', 'أخرى'],
];

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

export default function PortfolioManage() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();
  const [videos, setVideos] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('shipbuilding');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

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

  if (loading) return <p style={{ textAlign: 'center', marginTop: 60, color: C.muted }}>جارٍ التحميل…</p>;

  if (!user)
    return (
      <div dir="rtl" style={{ padding: 24, textAlign: 'center' }}>
        <p>سجّل الدخول لإدارة معرض أعمالك.</p>
        <Link className="btn" to={`/login?next=${encodeURIComponent('/portfolio')}`}>تسجيل الدخول</Link>
      </div>
    );

  if (!canUsePortfolio(profile))
    return (
      <div dir="rtl" style={{ padding: 24, textAlign: 'center', lineHeight: 1.9 }}>
        <p>معرض الأعمال متاح للورشات والمحلات والموردين الذين اعتُمد نشاطهم ولديهم اشتراك فعّال.</p>
        <Link className="btn" to="/">العودة للرئيسية</Link>
      </div>
    );

  async function onSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (title.trim().length < 3) return setMsg({ ok: false, text: 'اكتب عنواناً لا يقل عن 3 أحرف.' });
    if (!file) return setMsg({ ok: false, text: 'اختر فيديو أولاً.' });
    if (!['video/mp4', 'video/quicktime'].includes(file.type))
      return setMsg({ ok: false, text: 'صيغة الفيديو المقبولة: MP4 أو MOV.' });
    if (file.size > MAX_SIZE)
      return setMsg({ ok: false, text: 'حجم الفيديو أكبر من 50 ميغا. اختر فيديو أقصر أو بجودة أقل.' });
    if ((videos?.length ?? 0) >= MAX_VIDEOS)
      return setMsg({ ok: false, text: `وصلت إلى الحد الأقصى (${MAX_VIDEOS} فيديو). احذف فيديو قديماً أولاً.` });

    setBusy(true);
    const uploaded = [];
    try {
      const { duration, thumb } = await inspectVideo(file);
      if (duration && duration > MAX_SECONDS) throw new Error('مدة الفيديو أطول من 3 دقائق. اختر فيديو أقصر.');

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
        const t = await store.upload(p, thumb, { contentType: 'image/jpeg', upsert: false });
        if (!t.error) {
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
      setMsg({ ok: true, text: 'تمت إضافة الفيديو إلى معرض أعمالك.' });
      await loadVideos();
    } catch (err) {
      if (uploaded.length) await supabase.storage.from('portfolio-videos').remove(uploaded);
      setMsg({ ok: false, text: arabicError(err, 'تعذّر رفع الفيديو. تأكد من اتصالك وحاول مرة أخرى.') });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(v) {
    if (!window.confirm('حذف هذا الفيديو نهائياً؟')) return;
    const paths = [v.video_path, v.thumbnail_path].filter(Boolean);
    await supabase.storage.from('portfolio-videos').remove(paths);
    const { error } = await supabase.from('portfolio_videos').delete().eq('id', v.id);
    if (error) setMsg({ ok: false, text: arabicError(error) });
    else loadVideos();
  }

  return (
    <div dir="rtl" style={{ padding: '16px 16px 120px', maxWidth: 720, margin: '0 auto' }}>
      <button
        type="button"
        onClick={() => nav(-1)}
        style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '10px 16px', fontFamily: 'inherit', fontWeight: 600, color: C.blue, cursor: 'pointer', boxShadow: '0 2px 10px rgba(10,110,184,.1)' }}
      >
        رجوع
      </button>

      <h1 style={{ fontSize: 22, color: C.navy, margin: '16px 0 4px' }}>معرض أعمالي</h1>
      <p style={{ color: C.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.8 }}>
        فيديوهات توثيقية لأعمالك (صناعة، طلاء، صيانة، اختبار محرك). تظهر في صفحة نشاطك فقط، ولا تظهر في الصفحة الرئيسية.
      </p>

      <form onSubmit={onSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={input} placeholder="عنوان الفيديو" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <select style={input} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <textarea style={{ ...input, minHeight: 80 }} placeholder="وصف مختصر (اختياري)" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} />

        <label style={{ ...input, borderStyle: 'dashed', borderColor: C.blue, color: C.blue, fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>
          {file ? `${file.name} (${(file.size / 1048576).toFixed(1)} ميغا)` : 'اختر فيديو (MP4 أو MOV، حتى 50 ميغا و3 دقائق)'}
          <input type="file" accept="video/mp4,video/quicktime" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        {msg && (
          <p role="status" style={{ margin: 0, fontSize: 14, color: msg.ok ? '#1b7a3d' : C.red }}>{msg.text}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{ padding: '14px 16px', borderRadius: 999, border: 'none', background: busy ? '#9cc3df' : C.blue, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? 'جارٍ الرفع… لا تغلق الصفحة' : 'إضافة إلى المعرض'}
        </button>
      </form>

      <h2 style={{ fontSize: 17, color: C.navy, margin: '24px 0 10px' }}>
        فيديوهاتي {videos ? `(${videos.length}/${MAX_VIDEOS})` : ''}
      </h2>

      {videos === null && <p style={{ color: C.muted }}>جارٍ التحميل…</p>}
      {videos && videos.length === 0 && <p style={{ color: C.muted }}>لم تضف أي فيديو بعد.</p>}

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
              <div style={{ color: C.muted, fontSize: 13 }}>{CATEGORIES.find(([k]) => k === v.category)?.[1]}</div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(v)}
              style={{ border: `2px solid ${C.line}`, background: '#fff', color: C.red, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
