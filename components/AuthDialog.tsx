import { useEffect, useState, type FormEvent } from 'react';
import { BadgeCheck, Loader2, LogOut, MailCheck, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CONTACT, SHOW_TOPUP_NOTICE } from '../config';
import { fmtPrice } from '../data';
import { backendReady, deleteAccount, errorMessage, fetchBalance, signIn, signOut, signUp } from '../lib/api';
import { useAuth, type AuthMode } from '../lib/auth';
import { useUi } from '../lib/ui';

interface Props {
  open: boolean;
  initialMode: AuthMode;
  onClose: () => void;
}

const field = 'w-full bg-background text-foreground border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function AuthDialog({ open, initialMode, onClose }: Props) {
  const { user } = useAuth();
  const { openLegal } = useUi();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [sure, setSure] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setPassword('');
      setError('');
      setConfirmSent(false);
      setAskDelete(false);
      setSure(false);
      setBusy(false);
    }
  }, [open, initialMode]);

  const userId = user?.id ?? '';
  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;
    fetchBalance()
      .then((b) => { if (!cancelled) setBalance(b); })
      .catch(() => { if (!cancelled) setBalance(null); });
    return () => { cancelled = true; };
  }, [open, userId]);

  // عند نجاح الدخول/التسجيل يظهر المستخدم في السياق فنغلق النافذة تلقائياً
  const justAuthed = open && !!user && (mode === 'signup' || mode === 'signin') && busy;
  useEffect(() => {
    if (justAuthed) {
      setBusy(false);
      onClose();
    }
  }, [justAuthed, onClose]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!backendReady()) {
      setError('خدمة الحسابات غير مفعّلة بعد. حاول لاحقاً.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('اكتب بريداً إلكترونياً صحيحاً.');
      return;
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('اكتب اسمك (حرفان على الأقل).');
        return;
      }
      if (password.length < 8 || !/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
        setError('كلمة المرور: 8 أحرف على الأقل وتحتوي حروفاً وأرقاماً.');
        return;
      }
      if (!consent) {
        setError('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية.');
        return;
      }
    } else if (!password) {
      setError('اكتب كلمة المرور.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await signUp(email, password, name);
        if (r === 'confirm') {
          setConfirmSent(true);
          setBusy(false);
        }
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await signOut();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto" dir="rtl">
        {user && !justAuthed ? (
          <div className="space-y-4">
            <DialogTitle className="font-display font-extrabold text-xl">حسابي</DialogTitle>
            <DialogDescription className="sr-only">إدارة حسابك</DialogDescription>
            <div className="flex items-center gap-3 bg-secondary rounded-2xl p-4">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-display font-extrabold flex items-center justify-center text-lg shrink-0">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate">{user.name || 'مستخدم مرسى'}</div>
                <div className="text-xs text-muted-foreground truncate" dir="ltr">{user.email}</div>
              </div>
            </div>

            <div className="bg-secondary rounded-2xl p-4">
              <div className="text-xs text-muted-foreground">رصيد حسابك</div>
              <div className="font-display font-extrabold text-2xl text-primary mt-1">
                {balance === null ? '—' : fmtPrice(balance)}
              </div>
              {SHOW_TOPUP_NOTICE && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                  يمكنك شحن رصيد حسابك عبر موقعنا الإلكتروني.
                </p>
              )}
            </div>

            <button type="button" onClick={logout} className="w-full flex items-center justify-center gap-2 border-2 border-primary text-primary font-bold h-12 rounded-xl">
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>

            {!askDelete ? (
              <button type="button" onClick={() => setAskDelete(true)} className="w-full flex items-center justify-center gap-2 text-destructive font-bold h-12 rounded-xl">
                <Trash2 className="w-4 h-4" /> حذف حسابي وبياناتي
              </button>
            ) : (
              <div className="border border-destructive/40 rounded-2xl p-4 space-y-3">
                <p className="text-sm leading-relaxed">
                  سيتم حذف حسابك وكل إعلاناتك وصورك <b>نهائياً</b>، ويضيع أي رصيد متبقٍّ، ولا يمكن التراجع.
                </p>
                <label className="flex items-center gap-3 min-h-11 text-sm cursor-pointer">
                  <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="w-4 h-4" />
                  أفهم ذلك وأريد المتابعة
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!sure || busy}
                    onClick={doDelete}
                    className="flex-1 bg-destructive text-destructive-foreground font-bold h-11 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />} احذف نهائياً
                  </button>
                  <button type="button" onClick={() => { setAskDelete(false); setSure(false); }} className="px-5 h-11 rounded-xl border border-border font-bold">
                    تراجع
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive font-bold">
                {error} — أو راسلنا على <span dir="ltr">{CONTACT.email}</span> لحذف حسابك.
              </p>
            )}
            <button type="button" onClick={() => openLegal('delete')} className="block mx-auto text-xs text-muted-foreground underline underline-offset-4 h-9">
              تفاصيل حذف الحساب والبيانات
            </button>
          </div>
        ) : confirmSent ? (
          <div className="text-center py-6 space-y-3">
            <MailCheck className="w-14 h-14 text-primary mx-auto" />
            <DialogTitle className="font-display font-extrabold text-2xl">تحقق من بريدك</DialogTitle>
            <DialogDescription className="leading-relaxed">
              أرسلنا رسالة تأكيد إلى <b dir="ltr">{email}</b>. افتحها واضغط على رابط التأكيد، ثم ارجع هنا وسجّل الدخول.
              <br />
              <span className="text-xs">إن لم تجدها فتفقّد مجلد الرسائل غير المرغوبة (Spam).</span>
            </DialogDescription>
            <button type="button" onClick={() => { setConfirmSent(false); setMode('signin'); }} className="bg-primary text-primary-foreground font-bold px-8 h-11 rounded-full">
              تسجيل الدخول
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <DialogTitle className="font-display font-extrabold text-2xl">
              {mode === 'signup' ? 'افتح حسابك مجانا' : 'تسجيل الدخول'}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {mode === 'signup'
                ? 'حساب مجاني لنشر إعلاناتك وتسجيل نشاطك في الدليل البحري.'
                : 'أهلاً بعودتك إلى مرسى.'}
            </DialogDescription>

            {mode === 'signup' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoComplete="name"
                placeholder="الاسم"
                aria-label="الاسم"
                className={field}
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              placeholder="البريد الإلكتروني"
              aria-label="البريد الإلكتروني"
              className={field}
              dir="ltr"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              maxLength={72}
              placeholder={mode === 'signup' ? 'كلمة المرور (8 أحرف على الأقل)' : 'كلمة المرور'}
              aria-label="كلمة المرور"
              className={field}
              dir="ltr"
            />

            {mode === 'signup' && (
              <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="w-5 h-5 mt-0.5 shrink-0" />
                <span>
                  أبلغ 18 سنة فأكثر وأوافق على{' '}
                  <button type="button" onClick={() => openLegal('terms')} className="text-primary font-bold underline underline-offset-4">شروط الاستخدام</button>{' '}
                  و{' '}
                  <button type="button" onClick={() => openLegal('privacy')} className="text-primary font-bold underline underline-offset-4">سياسة الخصوصية</button>.
                </span>
              </label>
            )}

            {error && <p role="alert" className="text-sm text-destructive font-bold">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-accent text-accent-foreground font-display font-extrabold text-base py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-5 h-5" />}
              {mode === 'signup' ? 'افتح حسابك مجانا' : 'دخول'}
            </button>

            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
              className="block mx-auto text-sm text-primary font-bold h-10"
            >
              {mode === 'signup' ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ افتح حسابك مجانا'}
            </button>
            {mode === 'signin' && (
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                نسيت كلمة المرور؟ راسلنا على <span dir="ltr">{CONTACT.email}</span>
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
