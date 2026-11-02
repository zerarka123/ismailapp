import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { useListings } from '../lib/useListings';
import { fmtPrice, mapsLink, mapsSearchLink, telLink, waLink } from '../lib/format';
import { cssUrl, publicUrl } from '../lib/images';
import { coverOf } from './ListingCard.jsx';
import { isProActive, offerActive } from '../lib/pro';
import Icon from './Icon.jsx';

const DAY = 86400000;

// "Cold rooms / fish market" branch: today's offers of the accounts registered in it, each with photo, price,
// call / WhatsApp (signed-in visitors only, like everywhere in the app) and the location on the map.
export default function ColdRoomOffers({ sellerIds, pros, wilayaId }) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const { pathname } = useLocation();
  const filters = useMemo(() => ({ kind: 'gear', extra: true, sellerIds, ...(wilayaId ? { wilayaId } : {}) }), [sellerIds, wilayaId]);
  const { items: all, loading, error, done, more, reload } = useListings(filters);
  const items = useMemo(() => all.filter(offerActive), [all]);
  const canPost = isProActive(profile);
  const [contacts, setContacts] = useState({});
  const prosById = useMemo(() => Object.fromEntries((pros || []).map((p) => [p.owner_id, p])), [pros]);
  const idsKey = items.map((i) => i.id).join(',');

  useEffect(() => {
    if (!user || !items.length) return;
    let alive = true;
    supabase
      .from('listing_contacts')
      .select('listing_id, phone, whatsapp')
      .in('listing_id', items.map((i) => i.id))
      .then(({ data }) => {
        if (alive && data) setContacts((prev) => ({ ...prev, ...Object.fromEntries(data.map((c) => [c.listing_id, c])) }));
      });
    return () => {
      alive = false;
    };
  }, [user?.id, idsKey]);

  return (
    <>
      <div className="feed">
        {items.map((item) => {
          const pro = prosById[item.seller_id];
          const contact = contacts[item.id];
          const cover = coverOf(item.listing_images);
          const fresh = Date.now() - new Date(item.bumped_at || item.published_at).getTime() < DAY;
          const mapHref =
            pro?.latitude != null && pro?.longitude != null
              ? mapsLink(pro.latitude, pro.longitude)
              : mapsSearchLink([pro?.address, wilayaName(item.wilayas), 'Algérie'].filter(Boolean).join(', '));
          return (
            <div key={item.id} className="lcard">
              <Link to={`/listing/${item.id}`} className="lcard-img" style={cover ? { backgroundImage: cssUrl(publicUrl('listing-images', cover.storage_path)) } : undefined}>
                {fresh && <span className="tag live">{t('cold.today_tag')}</span>}
                <span className="price">{fmtPrice(item.price_dzd)}{item.unit ? ` / ${t(`unit.${item.unit}`)}` : ''}</span>
              </Link>
              <div className="lcard-body">
                <h3><Link to={`/listing/${item.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{item.title}</Link></h3>
                {pro?.business_name && <p>{pro.business_name}</p>}
                {item.quantity && <p className="muted small">{t('spec.quantity')}: {item.quantity}</p>}
                <span className="where"><Icon name="pin" size={13} /> {wilayaName(item.wilayas)}{pro?.address ? ` · ${pro.address}` : ''}</span>
                <div className="offer-actions">
                  {contact ? (
                    <>
                      <a className="btn sm" href={telLink(contact.phone)}><Icon name="phone" color="#fff" />{t('contact.call')}</a>
                      {contact.whatsapp && (
                        <a className="btn sm wa" href={waLink(contact.whatsapp, t('listing.wa_text', { title: item.title }))} target="_blank" rel="noopener noreferrer">
                          <Icon name="chat" color="#fff" />{t('contact.whatsapp')}
                        </a>
                      )}
                    </>
                  ) : !user ? (
                    <Link className="btn sm" to={`/login?next=${encodeURIComponent(pathname)}`}><Icon name="phone" color="#fff" />{t('cold.login_contact')}</Link>
                  ) : null}
                  <a className="btn sm alt" href={mapHref} target="_blank" rel="noopener noreferrer"><Icon name="pin" />{t('contact.location')}</a>
                </div>
              </div>
            </div>
          );
        })}
        {loading && <p className="muted center">{t('common.loading')}</p>}
        {error && (
          <p className="msg err">
            {t('common.load_failed')} <button className="linkbtn" onClick={reload}>{t('common.retry')}</button>
          </p>
        )}
        {!loading && !error && items.length === 0 && <p className="empty">{t('cold.none')}</p>}
        {!loading && !error && !done && <button className="btn alt" onClick={more}>{t('common.more')}</button>}
      </div>

      {canPost ? (
        <>
          <Link to="/sell?kind=gear&branch=fish_market&gear=product" className="btn sand" style={{ marginTop: 16 }}><Icon name="plus" />{t('cold.post_ad')}</Link>
          <p className="muted center" style={{ marginTop: 8, fontSize: 13 }}>{t('cold.post_hint')}</p>
        </>
      ) : (
        <p className="msg info" style={{ marginTop: 16 }}>
          {user ? t('cold.need_pro') : t('cold.need_login')}{' '}
          <Link className="linkbtn" to={user ? '/account' : `/login?next=${encodeURIComponent(pathname)}`}>{user ? t('cold.go_account') : t('cold.login_contact')}</Link>
        </p>
      )}
    </>
  );
}
