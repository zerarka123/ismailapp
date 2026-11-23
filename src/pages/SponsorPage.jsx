import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { goBack } from '../lib/goBack.js';
import { fmtPrice, mapsSearchLink, telLink, waLink } from '../lib/format';
import { getSponsor, sponsorImage, sponsorLogo, trackSponsor } from '../lib/sponsors';
import Icon from '../components/Icon.jsx';
import Carousel from '../components/Carousel.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { Avatar } from '../components/GuideFeed.jsx';

const fmtNum = (n) => String(Number(n)).replace(/\.0+$/, '');

// Page of one company of "عروض المصنّعين" (paid placement): logo, details, call / WhatsApp (shown to everyone:
// the company paid to be contacted), then its offers with photos. Marked as sponsored.
export default function SponsorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const [s, setS] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setS(undefined);
    getSponsor(id).then(
      (d) => {
        if (!alive) return;
        setS(d);
        if (d) trackSponsor(d.id, 'view');
      },
      () => alive && setS(null)
    );
    return () => {
      alive = false;
    };
  }, [id]);

  if (s === undefined) return <p className="muted center" style={{ marginTop: 60 }}>{t('common.loading')}</p>;
  if (s === null)
    return (
      <div className="needlogin">
        <p>{t('sp.unavailable')}</p>
        <Link className="btn" to="/">{t('common.back_home')}</Link>
      </div>
    );

  const here = `/sponsor/${s.id}`;
  const place = [wilayaName(s.wilayas), s.address].filter(Boolean).join(' · ');
  const wa = s.whatsapp || s.phone;
  const offers = (s.sponsor_offers || []).filter((o) => o.is_active);
  const onCall = () => trackSponsor(s.id, 'call');
  const onWa = () => trackSponsor(s.id, 'whatsapp');

  return (
    <>
      <div className="pd-top">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <ShareButton path={here} title={s.name} solo />
      </div>

      <section className="pd-card">
        <div className="pd-id">
          <Avatar url={sponsorLogo(s)} name={s.name} size={76} />
          <div className="gf-info">
            <h1 dir="auto">{s.name}</h1>
            <span className="gf-meta">
              {s.tagline && <span className="gf-branch" dir="auto">{s.tagline}</span>}
              {place && <span className="gf-where"><Icon name="pin" size={13} />{place}</span>}
            </span>
            <div className="pro-badges"><span className="pill sp-ad">{t('sp.sponsored')}</span></div>
          </div>
        </div>
        {s.description && <p className="pd-desc" dir="auto">{s.description}</p>}
        <div className="pd-contacts">
          {s.phone && (
            <a className="pd-row" href={telLink(s.phone)} onClick={onCall}>
              <span aria-hidden="true"><Icon name="phone" /></span>
              <span className="pd-text"><b>{t('contact.call')}</b><small><bdi dir="ltr">{s.phone}</bdi></small></span>
            </a>
          )}
          {wa && (
            <a className="pd-row wa" href={waLink(wa, t('sp.wa_text', { name: s.name }))} target="_blank" rel="noopener noreferrer" onClick={onWa}>
              <span aria-hidden="true"><Icon name="chat" /></span>
              <span className="pd-text"><b>{t('contact.whatsapp')}</b><small><bdi dir="ltr">{wa}</bdi></small></span>
            </a>
          )}
          {place && (
            <a className="pd-row loc" href={mapsSearchLink([s.name, s.address, s.wilayas?.name_fr || s.wilayas?.name_ar, 'Algérie'].filter(Boolean).join(', '))} target="_blank" rel="noopener noreferrer">
              <span aria-hidden="true"><Icon name="pin" /></span>
              <span className="pd-text"><b>{t('pro.location_map')}</b><small>{t('pro.on_maps')}</small></span>
              <Icon name="external" size={20} color="#0a6eb4" />
            </a>
          )}
        </div>
      </section>

      <div className="section-title" style={{ marginTop: 18 }}>{t('sp.offers')}</div>
      {offers.length === 0 && <p className="empty">{t('sp.no_offers')}</p>}
      {offers.map((o) => {
        const urls = (o.images || []).map(sponsorImage).filter(Boolean);
        const facts = [
          o.length_m ? t('sp.length_v', { n: fmtNum(o.length_m) }) : null,
          o.engine || null,
        ].filter(Boolean);
        return (
          <article key={o.id} className="sp-offer">
            {urls.length > 0 && <Carousel urls={urls} />}
            <div className="sp-offer-body">
              <h2 dir="auto">{o.title}</h2>
              <div className="sp-price">{o.price_dzd != null ? fmtPrice(o.price_dzd, o.price_currency) : t('sp.price_ask')}</div>
              {facts.length > 0 && <div className="sp-facts">{facts.map((f) => <span key={f} className="pill" dir="auto">{f}</span>)}</div>}
              {o.description && <p className="pd-desc" dir="auto">{o.description}</p>}
              {wa && (
                <a className="btn sp-ask" href={waLink(wa, t('sp.wa_offer', { title: o.title }))} target="_blank" rel="noopener noreferrer" onClick={onWa}>
                  <Icon name="chat" color="#fff" />{t('sp.ask_offer')}
                </a>
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}
