import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone } from '../lib/format';
import { REQUEST_CATEGORIES, URGENCY } from '../lib/fish';
import { goBack } from '../lib/goBack.js';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

export default function FishRequestNew() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [wilayas, setWilayas] = useState([]);
  const [f, setF] = useState({ category: 'fish', item: '', quantity: '', wilayaId: '', commune: '', urgency: 'today', phone: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);
  useEffect(() => {
    if (profile) setF((p) => ({ ...p, phone: p.phone || profile.phone || '', wilayaId: p.wilayaId || (profile.wilaya_id ? String(profile.wilaya_id) : '') }));
  }, [profile?.id]);

  if (!user) return <NeedLogin text={t('fish.login_contact')} />;

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (f.item.trim().length < 2) return setMsg({ type: 'err', text: t('fish.v_species') });
    if (!f.wilayaId) return setMsg({ type: 'err', text: t('v.wilaya') });
    if (!PHONE_RE.test(cleanPhone(f.phone))) return setMsg({ type: 'err', text: t('v.phone') });
    setBusy(true);
    const { data, error } = await supabase.from('fish_requests').insert({
      user_id: user.id,
      category: f.category,
      item: f.item.trim().slice(0, 80),
      quantity: f.quantity.trim().slice(0, 40) || null,
      wilaya_id: Number(f.wilayaId),
      commune: f.commune.trim().slice(0, 60) || null,
      urgency: f.urgency,
    }).select('id').single();
    if (error) {
      setBusy(false);
      return setMsg({ type: 'err', text: (error.message || '').includes('fish_request_limit') ? t('fish.req_limit') : errorText(error) });
    }
    const { error: e2 } = await supabase.from('fish_request_contacts').insert({ request_id: data.id, phone: cleanPhone(f.phone), whatsapp: cleanPhone(f.phone) });
    if (e2) {
      await supabase.from('fish_requests').delete().eq('id', data.id);
      setBusy(false);
      return setMsg({ type: 'err', text: errorText(e2) });
    }
    nav(`/fish/requests/${data.id}`, { replace: true });
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('fish.req_new')}</h2>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="field"><label>{t('fish.req_cat')}</label>
          <div className="chips wrap">
            {REQUEST_CATEGORIES.map((c) => <button key={c} type="button" className={`chip ${f.category === c ? 'on' : ''}`} onClick={() => setF({ ...f, category: c })}>{t(`fish.cat_${c}`)}</button>)}
          </div>
        </div>
        <div className="field"><label>{t('fish.req_item')}</label><input className="input" value={f.item} onChange={set('item')} placeholder={t('fish.req_item_ph')} maxLength={80} /></div>
        <div className="field"><label>{t('fish.req_qty')}</label><input className="input" value={f.quantity} onChange={set('quantity')} placeholder={t('fish.qty_ph')} maxLength={40} /></div>
        <div className="row2">
          <div className="field"><label>{t('field.wilaya')}</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">—</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('fish.req_commune')}</label><input className="input" value={f.commune} onChange={set('commune')} maxLength={60} /></div>
        </div>
        <div className="field"><label>{t('fish.urgency')}</label>
          <div className="chips wrap">
            {URGENCY.map((u) => <button key={u} type="button" className={`chip ${f.urgency === u ? 'on' : ''}`} onClick={() => setF({ ...f, urgency: u })}>{t(`fish.urg_${u}`)}</button>)}
          </div>
        </div>
        <div className="field"><label>{t('field.phone')}</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} placeholder="05XXXXXXXX" />
          <small className="muted">{t('fish.req_phone_note')}</small>
        </div>
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>{busy ? t('common.loading') : t('fish.req_send')}</button>
      </form>
    </>
  );
}
