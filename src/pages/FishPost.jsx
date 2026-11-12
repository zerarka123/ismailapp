import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { FISH_SPECIES, speciesName } from '../lib/fish';
import { removeFiles, uploadImages } from '../lib/images';
import { inspectVideo } from '../components/PortfolioManage.jsx';
import ImagePicker from '../components/ImagePicker.jsx';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import { goBack } from '../lib/goBack.js';
import { getWilayas } from '../lib/refData';

// Quick form for an active fisherman / fishmonger: one screen, publishes at once (no approval).
export default function FishPost() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [seller, setSeller] = useState(null); // null = loading, '' = not a seller, 'fisherman' | 'fishmonger'
  const [wilayas, setWilayas] = useState([]);
  const [f, setF] = useState({ species: '', custom: '', price: '', quantity: '', wilayaId: '', place: '', phone: '' });
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    getWilayas().then(setWilayas);
  }, []);
  useEffect(() => {
    if (profile) setF((p) => ({ ...p, phone: p.phone || profile.phone || '', wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : '') }));
  }, [profile?.id]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ok } = await supabase.rpc('is_fish_seller', { p_uid: user.id });
      if (!ok) return setSeller('');
      const { data } = await supabase.from('professional_profiles').select('subscription_ends_at').eq('owner_id', user.id).eq('pro_type', 'fisherman').eq('status', 'active');
      const fisher = (data || []).some((p) => !p.subscription_ends_at || new Date(p.subscription_ends_at) > new Date());
      setSeller(fisher ? 'fisherman' : 'fishmonger');
    })();
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('sell.login')} />;

  function pickVideo(file) {
    if (!file) return;
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) return setMsg({ type: 'err', text: t('pf.video_type') });
    if (file.size > 50 * 1024 * 1024) return setMsg({ type: 'err', text: t('pf.video_too_big') });
    setMsg(null);
    setVideo(file);
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const name = f.species === 'أخرى' ? f.custom.trim() : f.species;
    if (!f.species || name.length < 2) return setMsg({ type: 'err', text: t('fish.v_species') });
    if (f.price && (!/^\d{1,9}$/.test(f.price) || Number(f.price) <= 0)) return setMsg({ type: 'err', text: t('fish.v_price') });
    if (!f.wilayaId) return setMsg({ type: 'err', text: t('v.wilaya') });
    if (!PHONE_RE.test(cleanPhone(f.phone))) return setMsg({ type: 'err', text: t('v.phone') });
    if (!images.length && !video) return setMsg({ type: 'err', text: t('fish.v_photo') });
    setBusy(true);
    const uploaded = [];
    const uploadedVideos = [];
    let listingId = null;
    try {
      let videoPath = null;
      if (video && seller === 'fisherman') {
        const { duration } = await inspectVideo(video);
        if (duration && duration > 40) throw new Error('err.video_too_long');
        const ext = video.type === 'video/quicktime' ? 'mov' : 'mp4';
        videoPath = `${user.id}/ad-${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from('portfolio-videos').upload(videoPath, video, { contentType: video.type, upsert: false });
        if (up.error) throw up.error;
        uploadedVideos.push(videoPath);
      }
      const w = wilayas.find((x) => String(x.id) === String(f.wilayaId));
      const title = `${name} - ${f.place.trim() || (w ? wilayaName(w) : '')}`.slice(0, 120);
      const sellerName = profile?.full_name?.trim().length >= 2 ? profile.full_name.trim().slice(0, 80) : t('sell.default_seller');
      const row = {
        seller_id: user.id,
        seller_name: sellerName,
        kind: seller === 'fisherman' ? 'equipment' : 'gear',
        title: title.length >= 5 ? title : `${title} ....`.slice(0, 120),
        description: '',
        price_dzd: f.price ? Number(f.price) : null,
        wilaya_id: Number(f.wilayaId),
        place_text: f.place.trim().slice(0, 150) || null,
        product_type: 'fish',
        unit: 'kg',
        quantity: f.quantity.trim().slice(0, 40) || null,
        offer_days: 1,
        fish_species: f.species === 'أخرى' ? name.slice(0, 40) : f.species,
        ...(seller === 'fishmonger' ? { gear_type: 'product' } : {}),
        ...(videoPath ? { video_path: videoPath } : {}),
      };
      const { data: ins, error } = await supabase.from('listings').insert(row).select('id').single();
      if (error) throw error;
      listingId = ins.id;
      if (images.length) {
        await uploadImages('listing-images', `${user.id}/${listingId}`, images.map((i) => i.blob), uploaded);
        const { error: e2 } = await supabase.from('listing_images').insert(uploaded.map((p, i) => ({ listing_id: listingId, storage_path: p, sort_order: i })));
        if (e2) throw e2;
      }
      // contacts last: the notification trigger fires on this row, when the ad is complete
      const { error: e3 } = await supabase.from('listing_contacts').insert({ listing_id: listingId, phone: cleanPhone(f.phone), whatsapp: cleanPhone(f.phone) });
      if (e3) throw e3;
      nav('/fish/today', { replace: true });
    } catch (err) {
      if (uploaded.length) await removeFiles('listing-images', uploaded);
      if (uploadedVideos.length) await supabase.storage.from('portfolio-videos').remove(uploadedVideos);
      if (listingId) await supabase.from('listings').delete().eq('id', listingId);
      const raw = err?.message || '';
      const text = raw.includes('fisherman_only') || raw.includes('gear_pro_only') ? t('fish.sellers_only') : raw.startsWith('err.') ? t(raw) : errorText(err);
      setMsg({ type: 'err', text });
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('fish.post_title')}</h2>
      </div>
      {seller === null && <p className="muted center">{t('common.loading')}</p>}
      {seller === '' && (
        <div className="needlogin">
          <Icon name="fish" size={34} color="#0A6EB4" />
          <p>{t('fish.sellers_only')}</p>
          <Link className="btn" to="/register-business">{t('fish.become_seller')}</Link>
        </div>
      )}
      {seller && (
        <form onSubmit={submit} noValidate>
          <div className="field"><label>{t('fish.species')}</label>
            <div className="chips wrap">
              {FISH_SPECIES.map((s) => (
                <button key={s.ar} type="button" className={`chip ${f.species === s.ar ? 'on' : ''}`} onClick={() => setF({ ...f, species: s.ar })}>{speciesName(s.ar)}</button>
              ))}
            </div>
            {f.species === 'أخرى' && <input className="input" style={{ marginTop: 8 }} value={f.custom} onChange={set('custom')} maxLength={40} />}
          </div>
          <div className="row2">
            <div className="field"><label>{t('fish.price_kg')}</label><input className="input" inputMode="numeric" dir="ltr" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="field"><label>{t('fish.qty')}</label><input className="input" value={f.quantity} onChange={set('quantity')} placeholder={t('fish.qty_ph')} maxLength={40} /></div>
          </div>
          <div className="field"><label>{t('fish.photos')}</label><ImagePicker images={images} setImages={setImages} max={3} /></div>
          {seller === 'fisherman' && (
            <div className="field"><label>{t('fish.video_opt')}</label>
              <input type="file" accept="video/mp4,video/quicktime" onChange={(e) => pickVideo(e.target.files?.[0])} />
              {video && <small className="muted"> {video.name}</small>}
            </div>
          )}
          <div className="field"><label>{t('field.wilaya')}</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">—</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('fish.place')}</label><input className="input" value={f.place} onChange={set('place')} maxLength={150} /></div>
          <div className="field"><label>{t('field.phone')}</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} placeholder="05XXXXXXXX" /></div>
          <p className="muted small">{t('fish.expires_note')} {t('fish.price_note')}</p>
          {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
          <button className="btn" disabled={busy}>{busy ? t('common.loading') : t('fish.post_btn')}</button>
        </form>
      )}
    </>
  );
}
