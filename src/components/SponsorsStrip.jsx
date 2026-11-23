import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { cssUrl } from '../lib/images';
import { listLiveSponsors, sponsorImage, trackSponsor } from '../lib/sponsors';
import { Avatar } from './GuideFeed.jsx';

// One card; counts an "impression" the first time at least half of it is on screen (once per session).
function SponsorCard({ s }) {
  const { t } = useI18n();
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      trackSponsor(s.id, 'impression');
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackSponsor(s.id, 'impression');
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [s.id]);

  const cover = sponsorImage(s.cover_path);
  return (
    <Link ref={ref} to={`/sponsor/${s.id}`} className="sp-card" data-noswipe>
      <div className="sp-cover" style={cover ? { backgroundImage: cssUrl(cover) } : undefined} />
      <div className="sp-body">
        <Avatar url={sponsorImage(s.logo_path)} name={s.name} size={46} />
        <div className="sp-txt">
          <b dir="auto">{s.name}</b>
          {s.tagline && <small dir="auto">{s.tagline}</small>}
          {s.offers_count > 0 && <span className="sp-count">{s.offers_count === 1 ? t('sp.one_offer') : t('sp.n_offers', { n: s.offers_count })}</span>}
        </div>
      </div>
    </Link>
  );
}

// "عروض المصنّعين" on the market home: paid placements, clearly marked as sponsored. Hidden when empty.
export default function SponsorsStrip() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    listLiveSponsors().then(
      (d) => alive && setItems(d),
      () => alive && setItems([])
    );
    return () => {
      alive = false;
    };
  }, []);
  if (!items.length) return null;
  return (
    <section className="sp-strip" aria-label={t('sp.title')}>
      <div className="sp-head">
        <span className="section-title">🏭 {t('sp.title')}</span>
        <span className="pill sp-ad">{t('sp.sponsored')}</span>
      </div>
      <div className="hscroll">
        {items.map((s) => <SponsorCard key={s.id} s={s} />)}
      </div>
    </section>
  );
}
