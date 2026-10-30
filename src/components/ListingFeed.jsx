import { useListings } from '../lib/useListings';
import { useI18n } from '../i18n/index.jsx';
import ListingCard from './ListingCard.jsx';

export default function ListingFeed({ filters, emptyText }) {
  const { t } = useI18n();
  const { items, loading, error, done, more, reload } = useListings(filters);
  return (
    <div className="feed">
      {items.map((it) => (
        <ListingCard key={it.id} item={it} />
      ))}
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {error && (
        <p className="msg err">
          {t('common.load_failed')} <button className="linkbtn" onClick={reload}>{t('common.retry')}</button>
        </p>
      )}
      {!loading && !error && items.length === 0 && <p className="empty">{emptyText || t('feed.empty')}</p>}
      {!loading && !error && !done && (
        <button className="btn alt" onClick={more}>{t('common.more')}</button>
      )}
    </div>
  );
}
