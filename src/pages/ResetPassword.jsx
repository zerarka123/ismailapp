import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';

export default function ResetPassword() {
  const { clearRecovery } = useAuth();
  const { t } = useI18n();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ type: 'err', text: t('login.v_password') });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    clearRecovery();
  }

  return (
    <div className="app">
      <div className="auth">
        <img src="/logo.png" alt={t('app.name')} />
        <h1>{t('login.t_reset2')}</h1>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="pw">{t('login.new_password')}</label><input id="pw" className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" autoComplete="new-password" /></div>
          {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
          <button className="btn" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button>
        </form>
      </div>
    </div>
  );
}
