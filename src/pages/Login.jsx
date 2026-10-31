import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { safeNext } from '../lib/format';

// Mobile-friendly auth: sign-up and password reset use a 6-digit code sent by email
// (no links, so it works inside the Android app with no deep-link setup).
// Titles and subtitles per mode: login.t_<mode> / login.s_<mode>
const CODE_RE = /^\d{6,10}$/;

export default function Login() {
  const nav = useNavigate();
  const { clearRecovery } = useAuth();
  const { t } = useI18n();
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
      setMsg({ type: 'ok', text: t('login.code_resent') });
    } catch (err) {
      setMsg({ type: 'err', text: errorText(err) });
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    const email = form.email.trim();
    if (!email) return setMsg({ type: 'err', text: t('login.v_email') });
    if (mode === 'register' && form.name.trim().length < 2) return setMsg({ type: 'err', text: t('v.name') });
    if (['login', 'register', 'reset2'].includes(mode) && form.password.length < 8) return setMsg({ type: 'err', text: t('login.v_password') });
    if ((mode === 'verify' || mode === 'reset2') && !CODE_RE.test(form.code.trim())) return setMsg({ type: 'err', text: t('login.v_code') });
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
        setMsg({ type: 'ok', text: t('login.check_email') });
      } else if (mode === 'verify') {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code.trim(), type: 'signup' });
        if (error) throw error;
        nav(next, { replace: true });
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setCool(60);
        setMode('reset2');
        setMsg({ type: 'ok', text: t('login.reset_sent') });
      } else {
        const { error } = await supabase.auth.verifyOtp({ email, token: form.code.trim(), type: 'recovery' });
        if (error) throw error;
        const { error: e2 } = await supabase.auth.updateUser({ password: form.password });
        if (e2) throw e2;
        clearRecovery();
        nav('/', { replace: true });
      }
    } catch (err) {
      setMsg({ type: 'err', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const needPass = mode === 'login' || mode === 'register' || mode === 'reset2';
  const needCode = mode === 'verify' || mode === 'reset2';

  return (
    <div className="auth">
      <div className="auth-lang"><LanguageSwitcher /></div>
      <img src="/logo.png" alt={t('app.name')} />
      <h1>{t(`login.t_${mode}`)}</h1>
      <p className="muted">{t(`login.s_${mode}`)}</p>
      {(mode === 'login' || mode === 'register') && (
        <div className="auth-google"><GoogleButton next={next} onError={(text) => setMsg({ type: 'err', text })} /></div>
      )}
      <form onSubmit={submit} noValidate>
        {mode === 'register' && (
          <div className="field"><label htmlFor="n">{t('login.full_name')}</label><input id="n" className="input" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" /></div>
        )}
        <div className="field"><label htmlFor="e">{t('login.email')}</label><input id="e" className="input" type="email" placeholder="name@email.com" value={form.email} onChange={set('email')} dir="ltr" autoComplete="email" readOnly={mode === 'verify'} /></div>
        {needCode && (
          <div className="field"><label htmlFor="c">{t('login.code')}</label><input id="c" className="input" inputMode="numeric" placeholder="123456" value={form.code} onChange={set('code')} dir="ltr" maxLength={10} autoComplete="one-time-code" /></div>
        )}
        {needPass && (
          <div className="field"><label htmlFor="p">{mode === 'reset2' ? t('login.new_password') : t('login.password')}</label><input id="p" className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} dir="ltr" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
        )}
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? t('common.wait') : mode === 'verify' ? t('login.confirm') : mode === 'reset2' ? t('login.change_password') : mode === 'reset' ? t('login.send_code') : t(`login.t_${mode}`)}</button>
      </form>
      {needCode && (
        <p style={{ marginTop: 10 }}><button type="button" className="linkbtn" onClick={resend} disabled={cool > 0}>{cool > 0 ? t('login.resend_wait', { s: cool }) : t('login.resend')}</button></p>
      )}
      {mode === 'register' && (
        <p className="muted small" style={{ marginTop: 10 }}>
          {t('login.agree')} <Link to="/terms" className="linkbtn">{t('legal.terms')}</Link> {t('common.and')} <Link to="/privacy" className="linkbtn">{t('legal.privacy')}</Link>.
        </p>
      )}
      <div className="links">
        {mode === 'login' && <button className="btn alt" onClick={() => switchMode('register')}>{t('login.create')}</button>}
        {mode !== 'login' && <button className="btn alt" onClick={() => switchMode('login')}>{t('login.have_account')}</button>}
        {mode === 'login' && <button className="linkbtn" onClick={() => switchMode('reset')}>{t('login.forgot')}</button>}
        <Link to="/" className="linkbtn">{t('login.guest')}</Link>
      </div>
    </div>
  );
}
