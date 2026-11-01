import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { cssUrl, publicUrl } from '../lib/images';
import { coverOf } from '../components/ListingCard.jsx';
import Icon from '../components/Icon.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ListingFeed from '../components/ListingFeed.jsx';
import JobBoardTabs from '../components/jobs/jobBoardtabs.jsx';
import ColdRoomOffers from '../components/ColdRoomOffers.jsx';
import { MERGED_BRANCHES, isBranchVisible } from '../lib/branches';

const PRO_SELECT = 'id, owner_id, business_name, description, address, latitude, longitude, badge_verified, wilayas(*), professional_images(storage_path, sort_order)';

// One branch of a guide: the accounts registered in it, their products (shown only here, not on the home page),
// and for the "jobs" branch the job board.
export default function GuideList() {
  const { section, slug } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const isJobs = slug === 'jobs';
  const isCold = slug === 'cold_rooms';
  const startTab = isJobs ? 'job_offer' : isCold ? 'products' : 'accounts';
  const [cat, setCat] = useState(undefined);
  const [catIds, setCatIds] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [wilaya, setWilaya] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState(startTab);

  useEffect(() => {
    setTab(startTab);
    setCat(undefined);
    if (!isBranchVisible(slug)) setCat(null);
    else {
      const slugs = MERGED_BRANCHES[slug] || [slug];
      supabase.from('guide_categories').select('*').eq('section', section).in('slug', slugs).then(({ data }) => {
        const main = (data || []).find((c) => c.slug === slug);
        setCat(main ?? null);
        setCatIds((data || []).map((c) => c.id));
      });
    }
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, [section, slug, startTab]);

  useEffect(() => {
    if (!cat) return;
    setItems(null);
    setError(false);
    let q = supabase
      .from('professional_profiles')
      .select(PRO_SELECT)
      .in('category_id', catIds.length ? catIds : [cat.id])
      .eq('status', 'active')
      .gt('subscription_ends_at', new Date().toISOString())
      .order('badge_verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (wilaya) q = q.eq('wilaya_id', Number(wilaya));
    q.then(({ data, error: e }) => {
      if (e) setError(true);
      else setItems(data);
    });
  }, [cat, catIds, wilaya]);

  const sellerIds = useMemo(() => (items || []).map((p) => p.owner_id), [items]);

  if (cat === null) return <p className="empty">{t('guide.not_found')}</p>;

  const jobFilters = { kind: tab, ...(wilaya ? { wilayaId: Number(wilaya) } : {}) };

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{cat ? categoryName(cat) : '…'}</h2>
      </div>
      <select className="input" value={wilaya} onChange={(e) => setWilaya(e.target.value)} aria-label={t('field.wilaya')}>
        <option value="">{t('common.all_wilayas')}</option>
        {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
      </select>

      {isJobs ? (
        <div style={{ marginTop: 12 }}>
          <JobBoardTabs value={tab === 'accounts' ? '' : tab} onChange={setTab} />
          <button type="button" className={`btn sm ${tab === 'accounts' ? '' : 'alt'}`} style={{ width: '100%', marginBottom: 6 }} onClick={() => setTab('accounts')}>{t('guide.accounts')}</button>
        </div>
      ) : (
        <div className="seg" style={{ marginTop: 12 }}>
          <button type="button" className={`btn sm ${tab === 'accounts' ? '' : 'alt'}`} onClick={() => setTab('accounts')}>{t('guide.accounts')}</button>
          <button type="button" className={`btn sm ${tab === 'products' ? '' : 'alt'}`} onClick={() => setTab('products')}>{t(isCold ? 'cold.offers' : 'tabs.products')}</button>
        </div>
      )}

      {isJobs && tab !== 'accounts' && (
        <>
          <Link to={tab === 'job_offer' ? '/post/job-offer' : '/post/job-request'} className="btn sand"><Icon name="plus" />{t(tab === 'job_offer' ? 'post.job_offer' : 'post.job_request')}</Link>
          <ListingFeed filters={jobFilters} emptyText={t('job.none')} />
        </>
      )}

      {tab === 'products' && (
        items === null ? <p className="muted center">{t('common.loading')}</p> : isCold ? (
          <ColdRoomOffers sellerIds={sellerIds} pros={items} wilayaId={wilaya ? Number(wilaya) : undefined} />
        ) : (
          <ListingFeed filters={{ kind: 'gear', sellerIds }} emptyText={t('guide.no_products')} />
        )
      )}

      {tab === 'accounts' && (
        <>
          <Link to={`/register-business?cat=${slug}`} className="btn sand" style={{ marginTop: 6 }}><Icon name="plus" />{t('guide.register')}</Link>
          {error && <p className="msg err" style={{ marginTop: 12 }}>{t('common.load_failed')}</p>}
          {!items && !error && <p className="muted center">{t('common.loading')}</p>}
          {items?.length === 0 && <p className="empty">{t('guide.no_accounts')}</p>}
          <div className="feed">
            {items?.map((p) => {
              const cover = coverOf(p.professional_images);
              return (
                <Link key={p.id} to={`/pro/${p.id}`} className="lcard">
                  <div className="lcard-img" style={{ height: 140, ...(cover ? { backgroundImage: cssUrl(publicUrl('pro-images', cover.storage_path)) } : {}) }}>
                    <span className="tag live">● {t('pro.status_active')}</span>
                  </div>
                  <div className="lcard-body">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{p.business_name}{p.badge_verified && <VerifiedBadge size={18} />}</h3>
                    {p.description && <p>{p.description.slice(0, 90)}{p.description.length > 90 ? '…' : ''}</p>}
                    <span className="where"><Icon name="pin" size={13} /> {wilayaName(p.wilayas)}{p.address ? ` · ${p.address}` : ''}</span>
                    <span className="open-portfolio">{t('guide.open_portfolio')} ›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
