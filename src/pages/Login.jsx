import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { safeNext } from '../lib/format';

// Mobile-friendly auth: sign-up and password reset use a 6-digit code sent by email
// (no links, so it works inside the Android app with no deep-link setup).
const TITLES = { login: 'تسجيل الدخول', register: 'إنشاء حساب', verify: 'أدخل الرمز', reset: 'استعادة كلمة السر', reset2: 'كلمة سر جديدة' };
const SUBS = {
  login: 'سجّل دخولك لتبيع وتتواصل',
  register: 'حساب مجاني في أقل من دقيقة',
  verify: 'أرسلنا رمزًا مكوّنًا من أرقام إلى بريدك',
  reset: 'سنرسل لك رمزًا على بريدك',
  reset2: 'أدخل الرمز الذي وصلك ثم كلمة السر الجديدة',
};
const CODE_RE = /^\d{6,10}$/;

export default function Login() {
  const nav = useNavigate();
  const { clearRecovery } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [cool, setCool] = useState(0);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const switchMode = (m) => {
    setMode(m);
    setMsg(null);
  };

  useEffect(() => {
    if (cool <= 0) return undefined;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  async function resend() {
    if (cool > 0) return;
    setMsg(null);
    try {
      const email = form.email.trim();
      const { error } = mode === 'reset2' ? await supabase.auth.resetPasswordForEmail(email) : await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setCool(60);
      setMsg({ type: 'ok', text: 'أرسلنا رمزًا جديدًا إلى بريدك.' });
    } catch (err) {
      setMsg({ type: 'err', text: arabicError(err) });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const email = form.email.trim();
    if (!email) return setMsg({ type: 'err', text: 'اكتب بريدك الإلكتروني.' });
    if (mode === 'register' && form.name.trim().length < 2) return setMsg({ type: 'err', text: 'اكتب اسمك (حرفان على الأقل).' });
    if (['login', 'register', 'reset2'].includes(mode) && form.password.length < 8) return setMsg({ type: 'err', text: 'كلمة السر 8 أحرف على الأقل.' });
    if ((mode === 'verify' || mode === 'reset2') && !CODE_RE.test(form.code.trim())) return setMsg({ type: 'err', text: 'اكتب الرمز الذي وصلك (أرقام فقط).' });
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (error) throw error;
        nav(next, { replace: true });
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password: form.password, options: { data: { full_name: form.name.trim() } } });
        if (error) throw error;
        if (data.session) return nav(next, { replace: true });
        setCool(60);
        setMode('verify');
        setMsg({ type: 'ok', text: 'تحقق من بريدك (وتفقّد البريد المزعج) ثم اكتب الرمز هنا.' });
      } else if (mode === 'verify') {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code.trim(), type: 'signup' });
        if (error) throw error;
        nav(next, { replace: true });
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setCool(60);
        setMode('reset2');
        setMsg({ type: 'ok', text: 'إن كان البريد مسجّلًا فستصلك رسالة تحتوي على رمز.' });
      } else {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code.trim(), type: 'recovery' });
        if (error) throw error;
        const { error: e2 } = await supabase.auth.updateUser({ password: form.password });
        if (e2) throw e2;
        clearRecovery();
        nav('/', { replace: true });
      }
    } catch (err) {
      setMsg({ type: 'err', text: arabicError(err) });
    } finally {
      setBusy(false);
    }
  }

  const needPass = mode === 'login' || mode === 'register' || mode === 'reset2';
  const needCode = mode === 'verify' || mode === 'reset2';

  return (
    <div className="auth">
      <img src="/logo.png" alt="مرسى" />
      <h1>{TITLES[mode]}</h1>
      <p className="muted">{SUBS[mode]}</p>
      <form onSubmit={submit} noValidate>
        {mode === 'register' && (
          <div className="field"><label htmlFor="n">الاسم الكامل</label><input id="n" className="input" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" /></div>
        )}
        <div className="field"><label htmlFor="e">البريد الإلكتروني</label><input id="e" className="input" type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} dir="ltr" autoComplete="email" readOnly={mode === 'verify'} /></div>
        {needCode && (
          <div className="field"><label htmlFor="c">الرمز</label><input id="c" className="input" inputMode="numeric" placeholder="123456" value={form.code} onChange={set('code')} dir="ltr" maxLength={10} autoComplete="one-time-code" /></div>
        )}
        {needPass && (
          <div className="field"><label htmlFor="p">{mode === 'reset2' ? 'كلمة السر الجديدة' : 'كلمة المرور'}</label><input id="p" className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
        )}
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? 'لحظة…' : mode === 'verify' ? 'تأكيد' : mode === 'reset2' ? 'تغيير كلمة السر' : mode === 'reset' ? 'أرسل الرمز' : TITLES[mode]}</button>
      </form>
      {needCode && (
        <p style={{ marginTop: 10 }}><button type="button" className="linkbtn" onClick={resend} disabled={cool > 0}>{cool > 0 ? `لم يصلني الرمز (بعد ${cool} ث)` : 'لم يصلني الرمز — أعد الإرسال'}</button></p>
      )}
      {mode === 'register' && (
        <p className="muted small" style={{ marginTop: 10 }}>
          بإنشاء حساب فإنك توافق على <Link to="/terms" className="linkbtn">شروط الاستخدام</Link> و<Link to="/privacy" className="linkbtn">سياسة الخصوصية</Link>.
        </p>
      )}
      <div className="links">
        {mode === 'login' && <button className="btn alt" onClick={() => switchMode('register')}>إنشاء حساب جديد</button>}
        {mode !== 'login' && <button className="btn alt" onClick={() => switchMode('login')}>لدي حساب</button>}
        {mode === 'login' && <button className="linkbtn" onClick={() => switchMode('reset')}>نسيت كلمة السر؟</button>}
        <Link to="/" className="linkbtn">تصفّح كزائر</Link>
      </div>
    </div>
  );
}
