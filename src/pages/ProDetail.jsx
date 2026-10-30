import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { mapsLink, mapsSearchLink, telLink, waLink } from '../lib/format';
import { publicUrl } from '../lib/images';
import { isLivePro, proKindLabel } from '../lib/accountTypes';
import Carousel from '../components/Carousel.jsx';
import Icon from '../components/Icon.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ProfileTabs from '../components/ProfileTabs.jsx';

const SELECT =
  'id, owner_id, pro_type, badge_verified, business_name, description, address, latitude, longitude, status, subscription_ends_at, wilayas(*), guide_categories(*), professional_images(storage_path, sort_order)';

// Portfolio page of one account in a guide branch: photos & videos of its work, its products,
// quick contact (call / WhatsApp), location (wilaya + port/address) and activity status.
export default function ProDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
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
      if (alive) setItem(data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

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

  const urls = [...item.professional_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => publicUrl('pro-images', i.storage_path));
  const here = `/pro/${item.id}`;
  const loginHere = `/login?next=${encodeURIComponent(here)}`;
  const mine = user?.id === item.owner_id;
  const live = isLivePro(item);
  const place = [wilayaName(item.wilayas), item.address].filter(Boolean).join(' · ');
  const mapHref =
    item.latitude != null ? mapsLink(item.latitude, item.longitude) : mapsSearchLink([item.address, item.wilayas?.name_ar, 'Algérie'].filter(Boolean).join(', '));
  const waText = t('pro.wa_text', { name: item.business_name });

  async function sendReport(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: t('report.too_short') });
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, professional_id: item.id, reason: reason.trim().slice(0, 500) });
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: t('report.thanks') });
    setReportOpen(false);
    setReason('');
  }

  // Quick actions: visitors are sent to login first (contacts are visible to signed-in users only)
  const callBtn = !user ? (
    <Link className="qa" to={loginHere}><Icon name="phone" />{t('contact.call')}</Link>
  ) : contact?.phone ? (
    <a className="qa" href={telLink(contact.phone)}><Icon name="phone" />{t('contact.call')}</a>
  ) : (
    <span className="qa off"><Icon name="phone" />{t('contact.call')}</span>
  );
  const waNumber = contact?.whatsapp || contact?.phone;
  const waBtn = !user ? (
    <Link className="qa wa" to={loginHere}><Icon name="chat" />{t('contact.whatsapp')}</Link>
  ) : waNumber ? (
    <a className="qa wa" href={waLink(waNumber, waText)} target="_blank" rel="noopener noreferrer"><Icon name="chat" />{t('contact.whatsapp')}</a>
  ) : (
    <span className="qa wa off"><Icon name="chat" />{t('contact.whatsapp')}</span>
  );

  return (
    <>
      <div className="detail-top">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <Carousel urls={urls} />
      </div>
      <div className="sheet">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.business_name}
          {item.badge_verified && <VerifiedBadge size={22} />}
        </h1>
        <div className="pro-badges">
          <span className={`pill ${live ? 'ok' : 'warn'}`}>● {live ? t('pro.status_active') : t('pro.status_inactive')}</span>
          {item.badge_verified && <span className="pill">{t('badge.verified')}</span>}
          <span className="pill">{categoryName(item.guide_categories)}</span>
          {item.pro_type && <span className="pill">{proKindLabel(item.pro_type)}</span>}
        </div>
        <span className="where"><Icon name="pin" size={14} /> {place}</span>

        <div className="quick-actions">
          {callBtn}
          {waBtn}
          <a className="qa loc" href={mapHref} target="_blank" rel="noopener noreferrer"><Icon name="pin" />{t('contact.location')}</a>
        </div>
        {user && contact === null && <p className="muted small center">{t('contact.none')}</p>}

        <div className="loc-card">
          <div><small>{t('field.wilaya')}</small><b>{wilayaName(item.wilayas) || '—'}</b></div>
          <div><small>{t('field.port_address')}</small><b>{item.address || '—'}</b></div>
        </div>

        {item.description && <p className="desc">{item.description}</p>}
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

      <div className="cta">
        {mine ? (
          <Link className="btn alt" to="/portfolio"><Icon name="edit" />{t('pro.manage_mine')}</Link>
        ) : !user ? (
          <>
            <Link className="btn" to={loginHere}><Icon name="phone" color="#fff" />{t('contact.contact')}</Link>
            <p className="note">{t('contact.login_needed')}</p>
          </>
        ) : contact === undefined ? (
          <p className="note">{t('contact.loading')}</p>
        ) : contact === null ? (
          <p className="note">{t('contact.none')}</p>
        ) : (
          <>
            <a className="btn" href={telLink(contact.phone)}><Icon name="phone" color="#fff" />{t('contact.call')}</a>
            {waNumber && (
              <a className="btn wa" href={waLink(waNumber, waText)} target="_blank" rel="noopener noreferrer"><Icon name="chat" color="#fff" />{t('contact.whatsapp')}</a>
            )}
          </>
        )}
      </div>
    </>
  );
}
