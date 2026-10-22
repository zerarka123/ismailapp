import { BadgeCheck, MapPin, Ship, Star } from 'lucide-react';
import { fmtPrice, type Boat } from '../data';
import { useFavorites } from '../lib/favorites';

interface Props {
  boat: Boat;
  onOpen: (boat: Boat) => void;
}

export default function BoatCard({ boat, onOpen }: Props) {
  const fav = useFavorites();
  const saved = fav.has(boat.id);
  const dims = boat.length ? `${boat.length} م` : null;
  const specs = [dims, boat.year ? String(boat.year) : null, boat.condition].filter(Boolean).join(' · ');
  const cover = boat.images[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(boat)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(boat)}
      className="group cursor-pointer text-start bg-card rounded-2xl overflow-hidden border border-border transition-shadow hover:shadow-xl w-full"
    >
      <div className="img-zoom relative aspect-[4/3] bg-secondary">
        {cover ? (
          <img src={cover} alt={boat.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Ship className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-3 start-3 flex gap-2">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            {boat.category}
          </span>
          {boat.postedAt === 'اليوم' && (
            <span className="bg-accent text-accent-foreground text-xs font-bold px-2.5 py-1 rounded-full">جديد</span>
          )}
        </div>
        <button
          type="button"
          aria-label={saved ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          onClick={(e) => {
            e.stopPropagation();
            fav.toggle(boat.id);
          }}
          className="absolute top-2 end-2 w-11 h-11 rounded-full bg-card/90 flex items-center justify-center"
        >
          <Star className={`w-5 h-5 ${saved ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
        </button>
        {boat.seller.kind === 'وكالة' && (
          <span className="absolute bottom-3 start-3 flex items-center gap-1 bg-card/90 text-foreground text-xs font-bold px-2.5 py-1 rounded-full">
            <BadgeCheck className="w-3.5 h-3.5 text-primary" />
            وكالة
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display font-bold text-base leading-snug line-clamp-1">{boat.title}</h3>
        {specs && <p className="text-muted-foreground text-sm mt-1.5">{specs}</p>}
        <p className="flex items-center gap-1 text-muted-foreground text-sm mt-1.5">
          <MapPin className="w-4 h-4" /> {boat.wilaya}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="font-display font-extrabold text-primary text-lg">{fmtPrice(boat.price)}</span>
          {boat.negotiable && <span className="text-xs text-muted-foreground">السعر قابل للتفاوض</span>}
        </div>
      </div>
    </div>
  );
}
