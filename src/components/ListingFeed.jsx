import { useListings } from '../lib/useListings';
import ListingCard from './ListingCard.jsx';

export default function ListingFeed({ filters, emptyText = 'لا توجد إعلانات حاليًا.' }) {
  const { items, loading, error, done, more, reload } = useListings(filters);
  return (
    <div className="feed">
      {items.map((it) => (
        <ListingCard key={it.id} item={it} />
      ))}
      {loading && <p className="muted center">جارٍ التحميل…</p>}
      {error && (
        <p className="msg err">
          تعذّر التحميل. <button className="linkbtn" onClick={reload}>أعد المحاولة</button>
        </p>
      )}
      {!loading && !error && items.length === 0 && <p className="empty">{emptyText}</p>}
      {!loading && !error && !done && (
        <button className="btn alt" onClick={more}>عرض المزيد</button>
      )}
    </div>
  );
}
