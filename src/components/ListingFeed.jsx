import { useListings } from '../lib/useListings';
import { useI18n } from '../i18n/index.jsx';
import ListingCard from './ListingCard.jsx';

export default function ListingFeed({ filters, emptyText }) {
  const { t } = useI18n();
  const { items, loading, error, done, more, reload } = useListings(filters);
  return (
    <div className="feed">
      {items.map((it, i) => (
        <ListingCard key={it.id} item={it} eager={i < 2} />
      ))}
      {/* first load: grey placeholders shaped like the cards; "show more": the usual text */}
      {loading && items.length === 0 && (
        <div className="feed-skel" role="status" aria-label={t('common.loading')}>
          {[0, 1, 2].map((n) => (
            <div key={n} className="lcard skel">
              <div className="lcard-img" />
              <div className="lcard-body"><i /><i /><i /></div>
            </div>
          ))}
        </div>
      )}
      {loading && items.length > 0 && <p className="muted center">{t('common.loading')}</p>}
      {error && (
        <p className="msg err">
          {t('common.load_failed')} <button className="linkbtn" onClick={reload}>{t('common.retry')}</button>
          {typeof error === 'string' && <small dir="ltr" style={{ display: 'block', marginTop: 6, opacity: 0.75 }}>{error}</small>}
        </p>
      )}
      {!loading && !error && items.length === 0 && <p className="empty">{emptyText || t('feed.empty')}</p>}
      {!loading && !error && !done && (
        <button className="btn alt" onClick={more}>{t('common.more')}</button>
      )}
    </div>
  );
}
