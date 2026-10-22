import { Ship, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { fmtPrice, type Boat } from '../data';
import { useFavorites } from '../lib/favorites';
import { useRemote } from '../lib/remote';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenBoat: (b: Boat) => void;
}

export default function FavoritesDialog({ open, onClose, onOpenBoat }: Props) {
  const fav = useFavorites();
  const { boats } = useRemote();
  const list = boats.filter((b) => fav.ids.includes(b.id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogTitle className="font-display font-extrabold text-xl">المفضلة ({list.length})</DialogTitle>
        <DialogDescription className="sr-only">الإعلانات التي حفظتها</DialogDescription>
        {list.length === 0 ? (
          <div className="text-center py-10">
            <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              لم تحفظ أي إعلان بعد. اضغط على النجمة في أي قارب لتجده هنا لاحقاً.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((b) => (
              <li key={b.id} className="flex items-center gap-3 bg-secondary rounded-xl p-2">
                <button
                  type="button"
                  className="flex items-center gap-3 flex-1 text-start min-w-0"
                  onClick={() => { onClose(); onOpenBoat(b); }}
                >
                  {b.images[0] ? (
                    <img src={b.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-16 h-16 rounded-lg bg-card flex items-center justify-center shrink-0 text-muted-foreground">
                      <Ship className="w-6 h-6" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-bold text-sm line-clamp-1">{b.title}</span>
                    <span className="block text-primary font-extrabold text-sm">{fmtPrice(b.price)}</span>
                    <span className="block text-xs text-muted-foreground">{b.wilaya}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="إزالة من المفضلة"
                  onClick={() => fav.toggle(b.id)}
                  className="w-11 h-11 flex items-center justify-center shrink-0"
                >
                  <Star className="w-5 h-5 fill-accent text-accent" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
