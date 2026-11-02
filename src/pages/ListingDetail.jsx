import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useFavorites } from '../favorites.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { conditionLabel, fmtDate, fmtPrice, isMissingSchema, telLink, waLink } from '../lib/format';
import { publicUrl } from '../lib/images';
import { kindKey, safetyKey } from '../lib/safety';
import Carousel from '../components/Carousel.jsx';
import Icon from '../components/Icon.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { isSponsored } from '../components/ListingCard.jsx';

const BASE =
  'id, seller_id, seller_name, kind, title, description, price_dzd, length_m, year_built, condition, engine_info, place_text, profession, status, expires_at, wilayas(*), boat_types(*), listing_images(storage_path, sort_order)';
const SELECT = `${BASE}, gear_type, sponsored_until`;
const SELECT_EXTRA = `${SELECT}, unit, quantity, offer_days, product_type`;

// Admin only: put a listing in the sponsored strip of the home page (migration 003)
function SponsorControls({ item, onChange }) {
  const { t } = useI18n();
  const [msg, setMsg] = useState(null);
  async function sponsor(days) {
    setMsg(null);
    const { error } = await supabase.rpc('admin_set_listing_sponsored', { p_id: String(item.id), p_days: days });
    if (error) return setMsg({ type: 'err', text: isMissingSchema(error) ? t('admin.needs_migration') : errorText(error) });
    setMsg({ type: 'ok', text: days ? t('admin.sponsored_ok', { n: days }) : t('admin.sponsor_removed') });
    onChange();
  }
  return (
    <div className="box">
      <b>{t('admin.sponsor_title')}</b>
      {isSponsored(item) && <div className="muted small">{t('admin.sponsored_until', { date: fmtDate(item.sponsored_until) })}</div>}
      <div className="mine-actions">
        <button className="mini" onClick={() => sponsor(7)}>{t('admin.sponsor_days', { n: 7 })}</button>
        <button className="mini" onClick={() => sponsor(30)}>{t('admin.sponsor_days', { n: 30 })}</button>
        {isSponsored(item) && <button className="mini danger" onClick={() => sponsor(0)}>{t('admin.sponsor_remove')}</button>}
      </div>
      {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 8 }}>{msg.text}</p>}
    </div>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const { ids, toggle } = useFavorites();
  const [item, setItem] = useState(undefined); // undefined = loading, null = not found
  const [contact, setContact] = useState(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    let res = await supabase.from('listings').select(SELECT_EXTRA).eq('id', id).maybeSingle();
    if (res.error && isMissingSchema(res.error)) res = await supabase.from('listings').select(SELECT).eq('id', id).maybeSingle();
    if (res.error && isMissingSchema(res.error)) res = await supabase.from('listings').select(BASE).eq('id', id).maybeSingle();
    return res.data ?? null;
  }, [id]);

  useEffect(() => {
    let alive = true;
    setItem(undefined);
    setContact(undefined);
    load().then((data) => {
      if (alive) setItem(data);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  useEffect(() => {
    if (!user || !item) return;
    let alive = true;
    supabase.from('listing_contacts').select('phone, whatsapp').eq('listing_id', item.id).maybeSingle().then(({ data }) => {
      if (alive) setContact(data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [user?.id, item?.id]);

  if (item === undefined) return <p className="muted center" style={{ marginTop: 60 }}>{t('common.loading')}</p>;
  if (item === null)
    return (
      <div className="needlogin">
        <p>{t('listing.unavailable')}</p>
        <Link className="btn" to="/">{t('common.back_home')}</Link>
      </div>
    );

  const images = [...item.listing_images].sort((a, b) => a.sort_order - b.sort_order);
  const urls = images.map((i) => publicUrl('listing-images', i.storage_path));
  const mine = user?.id === item.seller_id;
  const faved = ids.has(item.id);
  const here = `/listing/${item.id}`;
  const isJob = item.kind === 'job_offer' || item.kind === 'job_request';
  const specs = [
    ['spec.type', item.boat_types ? boatTypeName(item.boat_types) : t(kindKey(item))],
    ['spec.profession', item.profession],
    ['spec.quantity', item.quantity],
    ['spec.unit', item.unit ? t(`unit.${item.unit}`) : null],
    ['spec.length', item.length_m ? `${Number(item.length_m)} ${t('unit.m')}` : null],
    ['spec.engine', item.engine_info],
    ['spec.year', item.year_built],
    ['spec.condition', conditionLabel(item.condition)],
    ['spec.place', item.place_text],
  ].filter(([, v]) => v);

  async function onFav() {
    const ok = await toggle(item.id);
    if (!ok) nav(`/login?next=${encodeURIComponent(here)}`);
  }

  async function sendReport(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: t('report.too_short') });
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, listing_id: item.id, reason: reason.trim().slice(0, 500) });
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: t('report.thanks') });
    setReportOpen(false);
    setReason('');
  }

  return (
    <>
      <div className="detail-top">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <button className={`fav ${faved ? 'on' : ''}`} onClick={onFav} aria-label={t('nav.favorites')}><Icon name="star" size={20} fill={faved ? 'currentColor' : 'none'} /></button>
        <ShareButton path={here} title={item.title} />
        <Carousel urls={urls} />
      </div>

      <div className="sheet">
        <h1>{item.title}</h1>
        <div className="big-price">{isJob && item.price_dzd == null ? t('job.salary_open') : fmtPrice(item.price_dzd)}</div>
        <span className="where"><Icon name="pin" size={14} /> {wilayaName(item.wilayas)}</span>

        {specs.length > 0 && (
          <div className="specs">
            {specs.map(([k, v]) => (
              <div key={k} className="spec"><small>{t(k)}</small><b>{v}</b></div>
            ))}
          </div>
        )}

        <div className="seller">
          <div className="avatar">{item.seller_name.slice(0, 1).toUpperCase()}</div>
          <div><b>{item.seller_name}</b><div className="muted small">{wilayaName(item.wilayas)}</div></div>
        </div>

        {item.description && <p className="desc">{item.description}</p>}

        <div className="safety">
          <b>{t('safety.title')}</b> {t(safetyKey(item.kind, item.gear_type))}
        </div>

        {profile?.is_admin && <SponsorControls item={item} onChange={() => load().then(setItem)} />}

        {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</p>}

        {user && !mine && !reportOpen && (
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => setReportOpen(true)}>
            <Icon name="flag" size={14} /> {t('report.listing')}
          </button>
        )}
        {reportOpen && (
          <form onSubmit={sendReport} className="box">
            <textarea className="input" placeholder={t('report.listing_placeholder')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="row2" style={{ marginTop: 10 }}>
              <button className="btn sm">{t('common.send')}</button>
              <button type="button" className="btn alt sm" onClick={() => setReportOpen(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        )}
      </div>

      <div className="cta">
        {mine ? (
          <Link className="btn alt" to="/my-listings">{t('listing.yours')}</Link>
        ) : !user ? (
          <>
            <Link className="btn" to={`/login?next=${encodeURIComponent(here)}`}><Icon name="phone" color="#fff" />{t('contact.seller')}</Link>
            <p className="note">{t('contact.login_needed')}</p>
          </>
        ) : contact === undefined ? (
          <p className="note">{t('contact.loading')}</p>
        ) : contact === null ? (
          <p className="note">{t('contact.none_listing')}</p>
        ) : (
          <>
            <a className="btn" href={telLink(contact.phone)}><Icon name="phone" color="#fff" />{t('contact.call')}</a>
            {contact.whatsapp && (
              <a className="btn wa" href={waLink(contact.whatsapp, t('listing.wa_text', { title: item.title }))} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" color="#fff" />{t('contact.whatsapp')}
              </a>
            )}
          </>
        )}
      </div>
    </>
  );
}
