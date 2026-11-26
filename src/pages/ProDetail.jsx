import { goBack } from '../lib/goBack.js';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { mapsLink, mapsSearchLink, telLink, waLink } from '../lib/format';
import { publicUrl } from '../lib/images';
import { isLivePro, proKindLabel } from '../lib/accountTypes';
import Icon from '../components/Icon.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ProfileTabs from '../components/ProfileTabs.jsx';
import { Avatar, fmtKm } from '../components/GuideFeed.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { trackContact, trackView } from '../lib/analytics';

const SELECT =
  'id, owner_id, pro_type, badge_verified, business_name, description, address, latitude, longitude, status, subscription_ends_at, wilayas(*), guide_categories(*), professional_images(storage_path, sort_order)';

// Page of one account of the guides: round account photo and details, call / WhatsApp with the number shown
// (to signed-in users, as before), the location opening Google Maps, then its gallery (work, products & services)
// and its products. Opened from the guide feed, it also shows the distance when the visitor used "near me".
export default function ProDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { state } = useLocation();
  const [item, setItem] = useState(undefined);
  const [contact, setContact] = useState(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    setItem(undefined);
    setContact(undefined);
    supabase.from('professional_profiles').select(SELECT).eq('id', id).maybeSingle().then(({ data }) => {
      if (!alive) return;
      setItem(data ?? null);
      if (data) trackView('pro', data.id, data.guide_categories?.slug);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  // each professional page gets its own title (search engines read the rendered one)
  const businessName = item?.business_name;
  useEffect(() => {
    if (!businessName) return undefined;
    const before = document.title;
    document.title = `${businessName} | ${t('app.name')}`;
    return () => {
      document.title = before;
    };
  }, [businessName, t]);

  useEffect(() => {
    if (!user || !item) return;
    let alive = true;
    supabase.from('professional_contacts').select('phone, whatsapp').eq('professional_id', item.id).maybeSingle().then(({ data }) => {
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
        <p>{t('pro.unavailable')}</p>
        <Link className="btn" to="/">{t('common.back_home')}</Link>
      </div>
    );

  const first = [...(item.professional_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  const photoUrl = first ? publicUrl('pro-images', first.storage_path) : null;
  const distance = typeof state?.km === 'number' && Number.isFinite(state.km) ? state.km : null;
  const here = `/pro/${item.id}`;
  const loginHere = `/login?next=${encodeURIComponent(here)}`;
  const mine = user?.id === item.owner_id;
  const live = isLivePro(item);
  const place = [wilayaName(item.wilayas), item.address].filter(Boolean).join(' · ');
  const mapHref =
    item.latitude != null ? mapsLink(item.latitude, item.longitude) : mapsSearchLink([item.address, item.wilayas?.name_ar, 'Algérie'].filter(Boolean).join(', '));
  const waText = t('pro.wa_text', { name: item.business_name });
  // statistics: which account was contacted, from which button
  const branch = item.guide_categories?.slug;
  const onCall = (screen) => () => trackContact('call', 'pro', item.id, screen, branch);
  const onWa = (screen) => () => trackContact('whatsapp', 'pro', item.id, screen, branch);

  async function sendReport(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: t('report.too_short') });
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, professional_id: item.id, reason: reason.trim().slice(0, 500) });
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: t('report.thanks') });
    setReportOpen(false);
    setReason('');
  }

  // Contact rows: visitors are sent to login first (numbers are visible to signed-in users only)
  const waNumber = contact?.whatsapp || contact?.phone;
  const row = (cls, icon, label, value, props) => {
    const inner = (
      <>
        <span aria-hidden="true"><Icon name={icon} /></span>
        <span className="pd-text"><b>{label}</b><small>{/\d/.test(value || '') ? <bdi dir="ltr">{value}</bdi> : value}</small></span>
      </>
    );
    if (props === null) return <div className={`pd-row ${cls} off`}>{inner}</div>;
    if (props.to) return <Link className={`pd-row ${cls}`} to={props.to}>{inner}</Link>;
    return <a className={`pd-row ${cls}`} {...props}>{inner}</a>;
  };
  const callRow = !user
    ? row('', 'phone', t('contact.call'), t('pro.login_to_see'), { to: loginHere })
    : contact?.phone
      ? row('', 'phone', t('contact.call'), contact.phone, { href: telLink(contact.phone), onClick: onCall('pro_quick') })
      : row('', 'phone', t('contact.call'), contact === undefined ? t('contact.loading') : t('pro.no_number'), null);
  const waRow = !user
    ? row('wa', 'chat', t('contact.whatsapp'), t('pro.login_to_see'), { to: loginHere })
    : waNumber
      ? row('wa', 'chat', t('contact.whatsapp'), waNumber, { href: waLink(waNumber, waText), target: '_blank', rel: 'noopener noreferrer', onClick: onWa('pro_quick') })
      : row('wa', 'chat', t('contact.whatsapp'), contact === undefined ? t('contact.loading') : t('pro.no_number'), null);

  return (
    <>
      <div className="pd-top">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <ShareButton path={here} title={item.business_name} solo />
      </div>
      <section className="pd-card">
        <div className="pd-id">
          <Avatar url={photoUrl} name={item.business_name} size={76} />
          <div className="gf-info">
            <h1 dir="auto">{item.business_name}{item.badge_verified && <VerifiedBadge size={20} />}</h1>
            <span className="gf-meta">
              <span className="gf-branch">{categoryName(item.guide_categories)}</span>
              {place && <span className="gf-where"><Icon name="pin" size={13} />{place}</span>}
              {distance != null && <span className="gf-km">{t('gf.km_from_you', { n: fmtKm(distance) })}</span>}
            </span>
            <div className="pro-badges">
              <span className={`pill ${live ? 'ok' : 'warn'}`}>● {live ? t('pro.status_active') : t('pro.status_inactive')}</span>
              {item.badge_verified && <span className="pill">{t('badge.verified')}</span>}
              {item.pro_type && <span className="pill">{proKindLabel(item.pro_type)}</span>}
            </div>
          </div>
        </div>
        {item.description && <p className="pd-desc" dir="auto">{item.description}</p>}
        <div className="pd-contacts">
          {callRow}
          {waRow}
          <a className="pd-row loc" href={mapHref} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true"><Icon name="pin" /></span>
            <span className="pd-text"><b>{t('pro.location_map')}</b><small>{t('pro.on_maps')}</small></span>
            <Icon name="external" size={20} color="#0a6eb4" />
          </a>
        </div>
      </section>
      <div>
        {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</p>}
        {user && !mine && !reportOpen && (
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => setReportOpen(true)}><Icon name="flag" size={14} /> {t('report.business')}</button>
        )}
        {reportOpen && (
          <form onSubmit={sendReport} className="box">
            <textarea className="input" placeholder={t('report.placeholder')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="row2" style={{ marginTop: 10 }}>
              <button className="btn sm">{t('common.send')}</button>
              <button type="button" className="btn alt sm" onClick={() => setReportOpen(false)}>{t('common.cancel')}</button>
            </div>
          </form>
        )}

        {/* Portfolio (photos + videos) and products & services of this account; products show only here and in its branch */}
        <ProfileTabs ownerId={item.owner_id} professionalId={item.id} showPortfolio />
      </div>

      {mine && (
        <div className="cta">
          <Link className="btn" to="/edit-business"><Icon name="edit" color="#fff" />{t('edit.business_btn')}</Link>
          <Link className="btn alt" to="/portfolio"><Icon name="image" />{t('pro.manage_mine')}</Link>
        </div>
      )}
    </>
  );
}
