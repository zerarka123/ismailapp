import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { PAGE_SIZE } from '../config';
import { fmtPrice } from '../lib/format';
import { FISH_SPECIES, speciesName, timeAgo } from '../lib/fish';
import { cssUrl, publicUrl } from '../lib/images';
import Icon from './Icon.jsx';

const SELECT = 'id, title, price_dzd, unit, quantity, seller_id, seller_name, wilaya_id, place_text, published_at, fish_species, fish_expires_at, video_path, listing_images(storage_path, sort_order), wilayas(*)';

function FishCard({ item, followed, onFollow }) {
  const { t } = useI18n();
  const cover = [...(item.listing_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const name = item.fish_species ? speciesName(item.fish_species) : item.title;
  const where = [item.place_text, item.wilayas ? wilayaName(item.wilayas) : ''].filter(Boolean).join(' · ');
  return (
    <Link to={`/listing/${item.id}`} className="fcard">
      <div className="fcard-img" style={cover ? { backgroundImage: cssUrl(publicUrl('listing-images', cover.storage_path)) } : undefined}>
        {!cover && <Icon name="fish" size={34} color="#51708A" />}
        {item.video_path && <span className="tag">▶</span>}
        <button type="button" className={`fcard-follow ${followed ? 'on' : ''}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFollow(item.seller_id); }} aria-label={followed ? t('fish.following') : t('fish.follow_seller')}>
          <Icon name="bell" size={18} fill={followed ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="fcard-body">
        <h3>{name}</h3>
        <b className="fcard-price">{item.price_dzd != null ? `${fmtPrice(item.price_dzd)} ${item.unit === 'kg' || !item.unit ? t('fish.per_kg') : ''}` : t('fish.no_price')}</b>
        <span className="fcard-seller">{item.seller_name}</span>
        <span className="fcard-meta">{where}</span>
        <span className="fcard-meta">{timeAgo(item.published_at, t)}</span>
      </div>
    </Link>
  );
}

// Fish ads still alive (24 h). Same source (listings) for "arrived today" and "all fish ads".
export default function FishList({ postButton = false }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [species, setSpecies] = useState('');
  const [wilaya, setWilaya] = useState(() => (profile?.wilaya_id ? String(profile.wilaya_id) : ''));
  const [wilayas, setWilayas] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [follows, setFollows] = useState({ sellers: new Set(), species: new Set() });
  const page = useRef(0);
  const wilayaTouched = useRef(false);

  useEffect(() => {
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);
  useEffect(() => {
    if (!wilayaTouched.current && profile?.wilaya_id) setWilaya(String(profile.wilaya_id));
  }, [profile?.wilaya_id]);

  useEffect(() => {
    if (!user) return setFollows({ sellers: new Set(), species: new Set() });
    supabase.from('fish_follows').select('seller_id, species').then(({ data }) => {
      setFollows({
        sellers: new Set((data || []).map((r) => r.seller_id).filter(Boolean)),
        species: new Set((data || []).map((r) => r.species).filter(Boolean)),
      });
    });
  }, [user?.id]);

  const load = useCallback(async (reset) => {
    if (reset) page.current = 0;
    setLoading(true);
    setError(false);
    const from = page.current * PAGE_SIZE;
    const now = new Date().toISOString();
    let q = supabase.from('listings').select(SELECT)
      .eq('status', 'published').eq('product_type', 'fish')
      .gt('fish_expires_at', now).gt('expires_at', now)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (wilaya) q = q.eq('wilaya_id', Number(wilaya));
    if (species) q = q.or(`fish_species.eq.${species},title.ilike.%${species}%`);
    const { data, error: err } = await q;
    if (err) { setError(true); setLoading(false); return; }
    setItems((prev) => (reset ? data : [...prev, ...data]));
    setDone(data.length < PAGE_SIZE);
    setLoading(false);
  }, [species, wilaya]);

  useEffect(() => { load(true); }, [load]);

  async function toggleSeller(sellerId) {
    if (!user) return nav('/login?next=' + encodeURIComponent('/fish'));
    if (sellerId === user.id) return;
    const on = follows.sellers.has(sellerId);
    const next = new Set(follows.sellers);
    on ? next.delete(sellerId) : next.add(sellerId);
    setFollows((f) => ({ ...f, sellers: next }));
    if (on) await supabase.from('fish_follows').delete().eq('user_id', user.id).eq('seller_id', sellerId);
    else await supabase.from('fish_follows').insert({ user_id: user.id, seller_id: sellerId });
  }
  async function toggleSpecies() {
    if (!user) return nav('/login?next=' + encodeURIComponent('/fish'));
    const on = follows.species.has(species);
    const next = new Set(follows.species);
    on ? next.delete(species) : next.add(species);
    setFollows((f) => ({ ...f, species: next }));
    if (on) await supabase.from('fish_follows').delete().eq('user_id', user.id).eq('species', species);
    else await supabase.from('fish_follows').insert({ user_id: user.id, species });
  }

  return (
    <>
      <div className="chips">
        <button className={`chip ${species === '' ? 'on' : ''}`} onClick={() => setSpecies('')}>{t('common.all')}</button>
        {FISH_SPECIES.map((s) => (
          <button key={s.ar} className={`chip ${species === s.ar ? 'on' : ''}`} onClick={() => setSpecies(s.ar)}>{speciesName(s.ar)}</button>
        ))}
      </div>
      <div className="fish-tools">
        <select className="input" value={wilaya} onChange={(e) => { wilayaTouched.current = true; setWilaya(e.target.value); }} aria-label={t('field.wilaya')}>
          <option value="">{t('fish.all_wilayas')}</option>
          {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
        </select>
        {species && (
          <button type="button" className={`btn sm ${follows.species.has(species) ? '' : 'alt'}`} onClick={toggleSpecies}>
            <Icon name="bell" size={16} /> {follows.species.has(species) ? t('fish.following_type') : t('fish.follow_type')}
          </button>
        )}
      </div>
      {postButton && <Link to="/fish/post" className="btn sand" style={{ marginBottom: 14 }}><Icon name="plus" />{t('fish.post')}</Link>}

      <div className="fgrid">
        {items.map((it) => (
          <FishCard key={it.id} item={it} followed={follows.sellers.has(it.seller_id)} onFollow={toggleSeller} />
        ))}
      </div>
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {error && <p className="msg err">{t('common.load_failed')} <button className="linkbtn" onClick={() => load(true)}>{t('common.retry')}</button></p>}
      {!loading && !error && items.length === 0 && <p className="empty">{t('fish.empty')}</p>}
      {!loading && !error && !done && <button className="btn alt" onClick={() => { page.current += 1; load(false); }}>{t('common.more')}</button>}
    </>
  );
}
