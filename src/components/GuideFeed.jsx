import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, SUPABASE_HOST } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { cssUrl, thumbUrl } from '../lib/images';
import { getPosition } from '../lib/geo';
import { getGuideCategories, getWilayas } from '../lib/refData';
import { MERGED_BRANCHES, isBranchVisible } from '../lib/branches';
import Icon from './Icon.jsx';
import VerifiedBadge from './VerifiedBadge.jsx';

// One guide (marine / fisher) as a single scrolling feed, shown when the home page is swiped (pages/HomePager.jsx):
// a title box, search by wilaya + "near me", the branches with their number of accounts, then every account:
// round account photo, its details in a box, and a strip of its gallery (work, products & services).
// All the accounts of the guide are loaded once (a few hundred rows at most); filters and distances are computed
// in the phone. The visitor's location is asked only when "near me" is tapped and never leaves the phone.

const PRO_SELECT =
  'id, owner_id, business_name, description, address, latitude, longitude, badge_verified, wilaya_id, created_at, wilayas(*), guide_categories!inner(id, slug, section, sort_order), professional_images(storage_path, sort_order)';
const PAGE = 10;
const THUMBS = 3;
const CACHE_MS = 2 * 60 * 1000;
const cache = {}; // section -> { at, pros }
const thumbCache = new Map(); // professional_id -> [storage_path]

// branch of an account as shown in the guide (merged branches count under their main branch)
const MAIN_OF = {};
for (const [main, slugs] of Object.entries(MERGED_BRANCHES)) for (const s of slugs) MAIN_OF[s] = main;
const mainSlug = (slug) => MAIN_OF[slug] || slug;

// Text used to match a typed wilaya: lower case, no accents, one way to write each Arabic letter
export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '') // Arabic short vowels, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Distance in km between two points (haversine)
export function km(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export const fmtKm = (d) => (d < 10 ? d.toFixed(1) : String(Math.round(d)));

const avatarOf = (p) => {
  const first = [...(p.professional_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return first ? thumbUrl('pro-images', first.storage_path) : null;
};
const initials = (name) =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function loadPros(section) {
  const hit = cache[section];
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve({ data: hit.pros });
  return supabase
    .from('professional_profiles')
    .select(PRO_SELECT)
    .eq('guide_categories.section', section)
    .eq('status', 'active')
    .gt('subscription_ends_at', new Date().toISOString())
    .order('badge_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)
    .then(({ data, error }) => {
      if (error) return { error };
      cache[section] = { at: Date.now(), pros: data || [] };
      return { data: data || [] };
    });
}

export function Avatar({ url, name, size = 52 }) {
  const [broken, setBroken] = useState(false);
  return url && !broken ? (
    <img className="gf-avatar" src={url} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} style={{ width: size, height: size }} />
  ) : (
    <span className="gf-avatar gf-avatar-empty" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size / 3) }}>{initials(name)}</span>
  );
}

export default function GuideFeed({ section }) {
  const { t, lang } = useI18n();
  const [pros, setPros] = useState(null);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [branch, setBranch] = useState('');
  const [wilaya, setWilaya] = useState(null); // wilaya row
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [near, setNear] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [thumbs, setThumbs] = useState({});
  const boxRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setPros(null);
    setError(null);
    setBranch('');
    loadPros(section).then(({ data, error: e }) => {
      if (!alive) return;
      if (e) setError(`${e.code || ''} ${e.message || ''} @ ${SUPABASE_HOST}`.trim());
      else setPros(data);
    });
    getGuideCategories().then((cats) => alive && setBranches((cats || []).filter((c) => c.section === section && isBranchVisible(c.slug))));
    getWilayas().then((w) => alive && setWilayas(w || []));
    return () => {
      alive = false;
    };
  }, [section]);

  // close the wilaya suggestions when tapping elsewhere
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => setShown(PAGE), [branch, wilaya?.id, near]);

  // accounts of the guide, by wilaya (the branch chips count inside the chosen wilaya)
  const inWilaya = useMemo(() => (pros || []).filter((p) => !wilaya || p.wilaya_id === wilaya.id), [pros, wilaya]);
  const counts = useMemo(() => {
    const c = {};
    for (const p of inWilaya) {
      const s = mainSlug(p.guide_categories?.slug);
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [inWilaya]);
  const perWilaya = useMemo(() => {
    const c = new Map();
    for (const p of pros || []) if (p.wilaya_id != null) c.set(p.wilaya_id, (c.get(p.wilaya_id) || 0) + 1);
    return c;
  }, [pros]);

  const list = useMemo(() => {
    let l = inWilaya.filter((p) => !branch || mainSlug(p.guide_categories?.slug) === branch);
    if (near) {
      const withD = l.map((p) => ({ p, d: p.latitude != null && p.longitude != null ? km(near, { lat: Number(p.latitude), lng: Number(p.longitude) }) : null }));
      const located = withD.filter((x) => x.d != null).sort((a, b) => a.d - b.d);
      const rest = withD.filter((x) => x.d == null);
      return [...located, ...rest];
    }
    return l.map((p) => ({ p, d: null }));
  }, [inWilaya, branch, near]);
  const locatedCount = useMemo(() => list.filter((x) => x.d != null).length, [list]);

  // gallery strip: the latest photos of the accounts on screen, fetched in one query
  const visibleIds = list.slice(0, shown).map((x) => x.p.id);
  const idsKey = visibleIds.join(',');
  useEffect(() => {
    const missing = visibleIds.filter((id) => !thumbCache.has(id));
    if (!missing.length) {
      setThumbs((old) => (visibleIds.every((id) => old[id] === thumbCache.get(id)) ? old : Object.fromEntries(visibleIds.map((id) => [id, thumbCache.get(id)]))));
      return undefined;
    }
    let alive = true;
    supabase
      .from('portfolio_photos')
      .select('professional_id, storage_path, created_at')
      .in('professional_id', missing)
      .order('created_at', { ascending: false })
      .limit(missing.length * 20)
      .then(({ data, error: e }) => {
        if (!alive || e) return;
        const by = {};
        for (const r of data || []) {
          const l = by[r.professional_id] || (by[r.professional_id] = []);
          if (l.length < THUMBS) l.push(r.storage_path);
        }
        for (const id of missing) thumbCache.set(id, by[id] || []);
        setThumbs(Object.fromEntries(visibleIds.map((id) => [id, thumbCache.get(id)])));
      });
    return () => {
      alive = false;
    };
  }, [idsKey]);

  // wilaya suggestions: only wilayas that have accounts in this guide
  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    const out = [];
    for (const w of wilayas) {
      const n = perWilaya.get(w.id);
      if (!n) continue;
      const names = [wilayaName(w, 'ar'), wilayaName(w, 'fr'), wilayaName(w, 'en'), String(w.id)].map(normalize);
      const starts = names.some((x) => x.startsWith(q) || x.split(' ').some((part) => part.startsWith(q)));
      if (starts || names.some((x) => x.includes(q))) out.push({ w, n, starts });
    }
    return out.sort((a, b) => b.starts - a.starts || b.n - a.n).slice(0, 6);
  }, [query, wilayas, perWilaya, lang]);

  // after a choice the list gets shorter: bring the search box back on screen, results right under it
  function showSearch() {
    requestAnimationFrame(() => {
      const top = boxRef.current?.getBoundingClientRect().top;
      if (top != null && top < 8) window.scrollBy(0, top - 8);
    });
  }

  function pickWilaya(w) {
    setWilaya(w);
    setQuery('');
    setOpen(false);
    showSearch();
  }

  async function toggleNear() {
    setGeoErr('');
    if (near) return setNear(null);
    setLocating(true);
    try {
      setNear(await getPosition());
      showSearch();
    } catch {
      setGeoErr(errorText({ message: 'location_denied' }));
    }
    setLocating(false);
  }

  const nearBtn = (
    <button type="button" className={`gf-near ${near ? 'on' : ''}`} onClick={toggleNear} disabled={locating} aria-pressed={!!near} aria-label={near ? t('gf.clear_near') : t('gf.near')}>
      <Icon name={near ? 'x' : 'locate'} size={16} />
      {locating ? t('gf.locating') : t('gf.near')}
    </button>
  );
  const selectedBranch = branches.find((c) => c.slug === branch);

  return (
    <div className="gf">
      <section className="gf-hero">
        <div>
          <h1>{t(`guide.${section}`)}</h1>
          <p>{t(`gf.${section}_sub`)}</p>
        </div>
        <span className="gf-hero-ic" aria-hidden="true"><Icon name={section === 'marine' ? 'boat' : 'fish'} size={26} color="#f4c95d" /></span>
      </section>

      <div className="gf-search" ref={boxRef}>
        <div className={`gf-field ${wilaya || near ? 'on' : ''}`}>
          <Icon name="pin" size={20} color="#0a6eb4" />
          {wilaya ? (
            <span className="gf-chosen">
              <span className="gf-chip-on">
                {wilayaName(wilaya)}
                <button type="button" onClick={() => { setWilaya(null); showSearch(); }} aria-label={t('gf.clear_wilaya')}><Icon name="x" size={14} /></button>
              </span>
            </span>
          ) : (
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions[0]) {
                  e.preventDefault();
                  pickWilaya(suggestions[0].w);
                }
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder={t('gf.wilaya_ph')}
              aria-label={t('gf.wilaya_label')}
              autoComplete="off"
              enterKeyHint="search"
            />
          )}
          {nearBtn}
        </div>
        {open && !wilaya && query && (
          <div className="gf-sugg" role="listbox" aria-label={t('gf.wilaya_label')}>
            {suggestions.length ? (
              suggestions.map(({ w, n }) => (
                <button key={w.id} type="button" role="option" aria-selected="false" onClick={() => pickWilaya(w)}>
                  <span><Icon name="pin" size={16} color="#51708a" />{wilayaName(w)}</span>
                  <small>{t('gf.n_accounts', { n })}</small>
                </button>
              ))
            ) : (
              <p className="muted small">{t('gf.no_wilaya')}</p>
            )}
          </div>
        )}
        {wilaya && pros && <p className="gf-status">{t('gf.in_wilaya', { n: inWilaya.length, w: wilayaName(wilaya) })}</p>}
        {near && <p className="gf-status">{t('gf.near_on')} · {t('gf.near_note', { n: locatedCount })}</p>}
        {geoErr && <p className="msg err" style={{ margin: 0 }}>{geoErr}</p>}
      </div>

      {branches.length > 1 && (
        <div className="chips gf-chips">
          <button type="button" className={`chip ${branch === '' ? 'on' : ''}`} onClick={() => setBranch('')}>{t('common.all')}</button>
          {branches.map((c) => (
            <button key={c.id} type="button" className={`chip ${branch === c.slug ? 'on' : ''}`} onClick={() => setBranch(branch === c.slug ? '' : c.slug)}>
              {categoryName(c)}{counts[c.slug] ? ` (${counts[c.slug]})` : ''}
            </button>
          ))}
        </div>
      )}
      {selectedBranch && (
        <Link className="gf-branch-link" to={`/guide/${section}/${selectedBranch.slug}`}>{t('gf.branch_page', { branch: categoryName(selectedBranch) })} ›</Link>
      )}

      {error && <p className="msg err">{t('guide.load_failed')}<small dir="ltr" style={{ display: 'block', marginTop: 6, opacity: 0.75 }}>{error}</small></p>}
      {!pros && !error && <p className="muted center">{t('common.loading')}</p>}
      {pros && list.length === 0 && <p className="empty">{pros.length ? t('gf.none') : t('guide.no_accounts')}</p>}

      <div className="gf-list">
        {list.slice(0, shown).map(({ p, d }) => {
          const photos = thumbs[p.id] || [];
          const cat = branches.find((c) => c.slug === mainSlug(p.guide_categories?.slug)) || p.guide_categories;
          return (
            <article key={p.id} className="gf-card">
              <Link to={`/pro/${p.id}`} state={d != null ? { km: d } : undefined} className="gf-head">
                <Avatar url={avatarOf(p)} name={p.business_name} />
                <span className="gf-info">
                  <strong dir="auto">{p.business_name}{p.badge_verified && <VerifiedBadge size={16} />}</strong>
                  <span className="gf-meta">
                    <span className="gf-branch">{categoryName(cat)}</span>
                    {p.wilayas && <span className="gf-where"><Icon name="pin" size={13} />{wilayaName(p.wilayas)}</span>}
                    {d != null && <span className="gf-km">{t('gf.km', { n: fmtKm(d) })}</span>}
                  </span>
                  {p.description && <span className="gf-desc" dir="auto">{p.description.length > 110 ? `${p.description.slice(0, 110)}…` : p.description}</span>}
                </span>
              </Link>
              {photos.length > 0 && (
                <div className="gf-gallery">
                  <div className="gf-gal-head">
                    <b>{t('gf.gallery')}</b>
                    <Link to={`/pro/${p.id}`}>{t('gf.see_all')}</Link>
                  </div>
                  <div className="gf-thumbs">
                    {photos.map((path) => (
                      <Link key={path} to={`/pro/${p.id}`} className="gf-thumb" style={{ backgroundImage: cssUrl(thumbUrl('pro-images', path)) }} aria-label={p.business_name} />
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {list.length > shown && (
        <button type="button" className="btn alt" onClick={() => setShown((n) => n + PAGE)}>{t('common.more')}</button>
      )}

      <Link to="/register-business" className="btn sand" style={{ marginTop: 16 }}><Icon name="plus" />{t('guide.register')}</Link>
    </div>
  );
}
