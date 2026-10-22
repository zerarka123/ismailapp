import { useState } from 'react';
import { BadgeCheck, Calendar, Check, Flag, Fuel, MessageCircle, Phone, Ruler, Settings2, Share2, Ship, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PLAY_URL } from '../config';
import { fmtPrice, type Boat } from '../data';
import { useFavorites } from '../lib/favorites';
import { telHref, waHref } from '../lib/format';
import { useUi } from '../lib/ui';

interface Props {
  boat: Boat | null;
  onClose: () => void;
}

export default function BoatDialog({ boat, onClose }: Props) {
  const fav = useFavorites();
  const { openReport } = useUi();
  const [copied, setCopied] = useState(false);
  const [shot, setShot] = useState<{ id: number | null; index: number }>({ id: null, index: 0 });

  const index = boat && shot.id === boat.id ? shot.index : 0;

  const share = async () => {
    if (!boat) return;
    const text = `${boat.title} — ${fmtPrice(boat.price)} (مرسى)${PLAY_URL ? `\n${PLAY_URL}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share(PLAY_URL ? { title: boat.title, text, url: PLAY_URL } : { title: boat.title, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* ألغى المستخدم المشاركة */
    }
  };

  const specs = boat
    ? [
        { icon: Ruler, label: 'الطول', value: boat.length ? `${boat.length} م` : '—' },
        { icon: Settings2, label: 'المحرك', value: boat.engine || '—' },
        { icon: Fuel, label: 'الوقود', value: boat.fuel },
        { icon: Calendar, label: 'سنة الصنع', value: boat.year ? String(boat.year) : '—' },
        { icon: Check, label: 'الحالة', value: boat.condition },
        { icon: Ship, label: 'الفئة', value: boat.category },
      ]
    : [];

  const tel = boat ? telHref(boat.seller.phone) : '';
  const wa = boat ? waHref(boat.seller.phone) : '';

  return (
    <Dialog open={!!boat} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0" dir="rtl">
        {boat && (
          <div className="flex flex-col max-h-[90vh]">
            <DialogTitle className="sr-only">{boat.title}</DialogTitle>
            <DialogDescription className="sr-only">تفاصيل الإعلان</DialogDescription>
            <div className="overflow-y-auto">
              <div className="relative aspect-[16/9] bg-secondary">
                {boat.images[index] ? (
                  <img src={boat.images[index]} alt={boat.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Ship className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 start-4 flex gap-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                    {boat.category}
                  </span>
                  {boat.postedAt && (
                    <span className="bg-card/90 text-foreground text-xs font-bold px-3 py-1.5 rounded-full">
                      {boat.postedAt}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 end-3 flex gap-2">
                  <button
                    type="button"
                    aria-label="مشاركة"
                    onClick={share}
                    className="h-11 min-w-11 px-3 rounded-full bg-card/90 flex items-center justify-center gap-1 text-xs font-bold"
                  >
                    {copied ? 'تم النسخ' : <Share2 className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="المفضلة"
                    onClick={() => fav.toggle(boat.id)}
                    className="w-11 h-11 rounded-full bg-card/90 flex items-center justify-center"
                  >
                    <Star className={`w-5 h-5 ${fav.has(boat.id) ? 'fill-accent text-accent' : ''}`} />
                  </button>
                </div>
              </div>

              {boat.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 pt-3">
                  {boat.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      aria-label={`صورة ${i + 1}`}
                      onClick={() => setShot({ id: boat.id, index: i })}
                      className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${i === index ? 'border-accent' : 'border-border'}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-5 md:p-7">
                <h2 className="font-display font-extrabold text-xl md:text-2xl leading-snug">{boat.title}</h2>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display font-extrabold text-primary text-3xl">{fmtPrice(boat.price)}</span>
                  {boat.negotiable && <span className="text-sm text-muted-foreground">قابل للتفاوض</span>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
                  {specs.map((s) => (
                    <div key={s.label} className="bg-secondary rounded-xl p-3">
                      <s.icon className="w-4 h-4 text-primary mb-1.5" />
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-sm font-bold leading-snug">{s.value}</div>
                    </div>
                  ))}
                </div>

                {boat.description && (
                  <p className="text-sm md:text-base leading-relaxed text-foreground/85 mt-5 whitespace-pre-line break-words">{boat.description}</p>
                )}

                <div className="mt-7 bg-secondary rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display font-extrabold flex items-center justify-center text-lg shrink-0">
                    {boat.seller.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="truncate">{boat.seller.name}</span>
                      {boat.seller.kind === 'وكالة' && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {boat.seller.kind} · {boat.seller.wilaya}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  نصيحة مرسى: عاين القارب بنفسك قبل الدفع، وتأكد من أوراق التسجيل والمحرك. لا ترسل أي مبلغ مسبقاً.
                </p>

                <button
                  type="button"
                  onClick={() => openReport({ type: 'listing', id: boat.id, label: boat.title })}
                  className="mt-3 flex items-center gap-2 text-sm font-bold text-destructive h-11"
                >
                  <Flag className="w-4 h-4" /> إبلاغ عن هذا الإعلان
                </button>
              </div>
            </div>

            {/* شريط اتصال ثابت أسفل النافذة */}
            <div className="border-t border-border bg-card p-3 flex gap-2">
              {tel ? (
                <a href={tel} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-base h-12 rounded-full">
                  <Phone className="w-5 h-5" />
                  اتصل
                </a>
              ) : null}
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold text-base h-12 rounded-full"
                >
                  <MessageCircle className="w-5 h-5" />
                  واتساب
                </a>
              ) : null}
              {!tel && !wa && <p className="flex-1 text-center text-sm text-muted-foreground py-3">رقم البائع غير متوفر</p>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
