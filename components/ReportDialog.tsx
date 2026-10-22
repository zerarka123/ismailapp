import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Flag, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ContactActions } from './ContactActions';
import { APP } from '../config';
import { backendReady, errorMessage, getCurrentUser, insertRow } from '../lib/api';
import type { ReportTarget } from '../lib/ui';

const REASONS = [
  'احتيال أو نصب',
  'محتوى مسيء أو مخالف للقانون',
  'إعلان وهمي أو مكرّر',
  'معلومات أو صور مضللة',
  'انتهاك حقوق (صور أو محتوى مسروق)',
  'مشكلة تقنية في التطبيق',
  'سبب آخر',
] as const;

const COOLDOWN_KEY = 'marsa-last-report';
const COOLDOWN_MS = 20000;

interface Props {
  open: boolean;
  target: ReportTarget;
  onClose: () => void;
}

const field = 'w-full bg-background text-foreground border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export default function ReportDialog({ open, target, onClose }: Props) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setDetails('');
      setContact(getCurrentUser()?.email ?? '');
      setBusy(false);
      setDone(false);
      setError('');
      setFallback(false);
    }
  }, [open]);

  const what =
    target.type === 'listing' ? 'إعلان' : target.type === 'business' ? 'نشاط في الدليل' : 'التطبيق';
  const subject = `بلاغ — ${what}${target.id ? ` #${target.id}` : ''}`;
  const emailBody = [
    `نوع البلاغ: ${what}`,
    target.id ? `رقم: ${target.id}` : '',
    target.label ? `العنوان: ${target.label}` : '',
    `السبب: ${reason || '—'}`,
    `التفاصيل: ${details || '—'}`,
    `إصدار التطبيق: ${APP.version}`,
  ]
    .filter(Boolean)
    .join('\n');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!reason) {
      setError('اختر سبب البلاغ.');
      return;
    }
    let last = 0;
    try {
      last = Number(localStorage.getItem(COOLDOWN_KEY)) || 0;
    } catch {
      /* لا يهم */
    }
    if (Date.now() - last < COOLDOWN_MS) {
      setError('أرسلت بلاغاً قبل قليل. انتظر لحظات ثم أعد المحاولة.');
      return;
    }
    if (!backendReady()) {
      setFallback(true);
      return;
    }
    setBusy(true);
    try {
      await insertRow(
        'reports',
        {
          target_type: target.type,
          target_id: target.id ?? null,
          target_label: (target.label ?? '').slice(0, 120),
          reason,
          details: details.trim().slice(0, 1000),
          contact: contact.trim().slice(0, 120),
        },
        false,
      );
      try {
        localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      } catch {
        /* لا يهم */
      }
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
      setFallback(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
            <DialogTitle className="font-display font-extrabold text-2xl">شكراً لك</DialogTitle>
            <DialogDescription className="mt-2 leading-relaxed">
              وصلنا بلاغك وسنراجعه ونتخذ الإجراء المناسب في أقرب وقت (عادةً خلال 72 ساعة).
            </DialogDescription>
            <button type="button" onClick={onClose} className="mt-6 bg-primary text-primary-foreground font-bold px-8 h-11 rounded-full">
              حسناً
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogTitle className="font-display font-extrabold text-xl flex items-center gap-2">
              <Flag className="w-5 h-5 text-accent" /> إبلاغ عن {what}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {target.label ? <span className="block font-bold text-foreground mb-1">{target.label}</span> : null}
              ساعدنا في إبقاء مرسى آمناً. اختر السبب وسنراجع البلاغ.
            </DialogDescription>

            <fieldset className="space-y-1">
              <legend className="sr-only">سبب البلاغ</legend>
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-3 min-h-11 text-sm cursor-pointer">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="w-4 h-4" />
                  {r}
                </label>
              ))}
            </fieldset>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="تفاصيل إضافية (اختياري)"
              aria-label="تفاصيل البلاغ"
              className={`${field} resize-none`}
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={120}
              placeholder="بريدك أو هاتفك للرد عليك (اختياري)"
              aria-label="وسيلة التواصل"
              className={field}
              dir="ltr"
            />

            {error && <p role="alert" className="text-sm text-destructive font-bold">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-accent text-accent-foreground font-display font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              إرسال البلاغ
            </button>

            {fallback && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-sm leading-relaxed">يمكنك أيضاً إرسال البلاغ مباشرة إلى بريدنا:</p>
                <ContactActions subject={subject} body={emailBody} />
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
