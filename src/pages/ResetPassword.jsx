import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';

export default function ResetPassword() {
  const { clearRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ type: 'err', text: 'كلمة السر 8 أحرف على الأقل.' });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    clearRecovery();
  }

  return (
    <div className="app">
      <div className="auth">
        <img src="/logo.png" alt="مرسى" />
        <h1>كلمة سر جديدة</h1>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="pw">كلمة السر الجديدة</label><input id="pw" className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} dir="ltr" autoComplete="new-password" /></div>
          {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
          <button className="btn" disabled={busy}>{busy ? 'لحظة…' : 'حفظ'}</button>
        </form>
      </div>
    </div>
  );
}
