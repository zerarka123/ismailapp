import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, fmtPrice, telLink, waLink } from '../lib/format';
import { timeAgo } from '../lib/fish';
import { goBack } from '../lib/goBack.js';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

function ContactButtons({ phone, whatsapp, text }) {
  const { t } = useI18n();
  return (
    <div className="seg">
      <a className="btn sm" href={telLink(phone)}><Icon name="phone" size={16} />{t('fish.call')}</a>
      <a className="btn sm wa" href={waLink(whatsapp || phone, text)} target="_blank" rel="noreferrer"><Icon name="chat" size={16} />{t('fish.whatsapp')}</a>
    </div>
  );
}

function ReportBox({ type, id }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  async function send() {
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: t('report.too_short') });
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('fish_reports').insert({ reporter_id: user.id, target_type: type, target_id: String(id), reason: reason.trim().slice(0, 300) });
    if (error && error.code !== '23505') return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: t('report.thanks') });
    setOpen(false);
  }
  if (msg?.type === 'ok') return <p className="msg ok">{msg.text}</p>;
  if (!open) return <button className="linkbtn" onClick={() => setOpen(true)}><Icon name="flag" size={14} /> {t('fish.report')}</button>;
  return (
    <div>
      <textarea className="input" placeholder={t('report.placeholder')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
      {msg && <p className="msg err">{msg.text}</p>}
      <button className="btn sm" onClick={send}>{t('fish.report_send')}</button>
    </div>
  );
}

function AnswerForm({ requestId, onDone }) {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState('');
  const [f, setF] = useState({ price: '', quantity: '', phone: profile?.phone || '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function send(available) {
    setMsg(null);
    if (available) {
      if (f.price && (!/^\d{1,9}$/.test(f.price) || Number(f.price) <= 0)) return setMsg({ type: 'err', text: t('fish.v_price') });
      if (!PHONE_RE.test(cleanPhone(f.phone))) return setMsg({ type: 'err', text: t('v.phone') });
    }
    setBusy(true);
    const { error } = await supabase.from('fish_offers').insert({
      request_id: requestId,
      seller_id: user.id,
      available,
      price_dzd: available && f.price ? Number(f.price) : null,
      quantity: available ? f.quantity.trim().slice(0, 40) || null : null,
      phone: available ? cleanPhone(f.phone) : null,
      whatsapp: available ? cleanPhone(f.phone) : null,
    });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: (error.message || '').includes('request_closed') ? t('fish.req_closed') : errorText(error) });
    onDone();
  }

  return (
    <div className="card-box">
      <b>{t('fish.your_answer')}</b>
      {mode !== 'yes' ? (
        <div className="seg">
          <button className="btn" onClick={() => setMode('yes')} disabled={busy}><Icon name="check" size={18} />{t('fish.available')}</button>
          <button className="btn alt" onClick={() => send(false)} disabled={busy}>{t('fish.unavailable')}</button>
        </div>
      ) : (
        <>
          <div className="row2">
            <div className="field"><label>{t('fish.offer_price')}</label><input className="input" inputMode="numeric" dir="ltr" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></div>
            <div className="field"><label>{t('fish.offer_qty')}</label><input className="input" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder={t('fish.qty_ph')} maxLength={40} /></div>
          </div>
          <div className="field"><label>{t('fish.offer_phone')}</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <p className="muted small">{t('fish.price_note')}</p>
          <button className="btn" onClick={() => send(true)} disabled={busy}>{t('fish.send_offer')}</button>
        </>
      )}
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
    </div>
  );
}

export default function FishRequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [req, setReq] = useState(undefined); // undefined = loading, null = not found
  const [wilayas, setWilayas] = useState([]);
  const [offers, setOffers] = useState([]);
  const [mine, setMine] = useState(null);
  const [contact, setContact] = useState(null);
  const [seller, setSeller] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setError(false);
    const { data: r, error: err } = await supabase.from('fish_requests').select('*').eq('id', id).maybeSingle();
    if (err) return setError(true);
    setReq(r);
    if (!r) return;
    if (r.user_id === user.id) {
      const { data } = await supabase.from('fish_offers').select('id, seller_id, available, price_dzd, quantity, phone, whatsapp, created_at').eq('request_id', id).order('created_at', { ascending: false });
      const rows = data || [];
      const ids = rows.map((o) => o.seller_id);
      let names = {};
      if (ids.length) {
        const { data: pp } = await supabase.from('professional_profiles').select('owner_id, business_name').in('owner_id', ids);
        names = Object.fromEntries((pp || []).map((p) => [p.owner_id, p.business_name]));
      }
      setOffers(rows.map((o) => ({ ...o, business: names[o.seller_id] })));
    } else {
      const { data: ok } = await supabase.rpc('is_fish_seller', { p_uid: user.id });
      setSeller(!!ok);
      const { data: o } = await supabase.from('fish_offers').select('*').eq('request_id', id).eq('seller_id', user.id).maybeSingle();
      setMine(o);
      if (o?.available) {
        const { data: c } = await supabase.from('fish_request_contacts').select('phone, whatsapp').eq('request_id', id).maybeSingle();
        setContact(c);
      }
    }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || [])); }, []);

  if (!user) return <NeedLogin text={t('fish.login_contact')} />;
  const w = req && wilayas.find((x) => x.id === req.wilaya_id);
  const owner = req && req.user_id === user.id;
  const ended = req && (req.status !== 'open' || new Date(req.expires_at) <= new Date());
  const hoursLeft = req ? Math.max(0, Math.ceil((new Date(req.expires_at) - Date.now()) / 3600000)) : 0;

  async function close() {
    await supabase.from('fish_requests').update({ status: 'closed' }).eq('id', id);
    load();
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('fish.need')}</h2>
      </div>
      {error && <p className="msg err">{t('common.load_failed')} <button className="linkbtn" onClick={load}>{t('common.retry')}</button></p>}
      {req === undefined && !error && <p className="muted center">{t('common.loading')}</p>}
      {req === null && <p className="empty">{t('fish.req_closed')}</p>}
      {req && (
        <>
          <div className="card-box">
            <div className="rrow-top"><b>{req.item}</b><span className={`urg ${req.urgency}`}>{t(`fish.urg_${req.urgency}`)}</span></div>
            <span className="muted">{[t(`fish.cat_${req.category}`), req.quantity, req.commune, w ? wilayaName(w) : ''].filter(Boolean).join(' · ')}</span>
            <span className="muted small">{timeAgo(req.created_at, t)} · {ended ? t('fish.req_closed') : t('fish.req_left', { n: hoursLeft })}</span>
            {owner && !ended && <button className="linkbtn" onClick={close}>{t('fish.req_close')}</button>}
            {!owner && <ReportBox type="request" id={req.id} />}
          </div>

          {owner && (
            <>
              <div className="section-title">{t('fish.offers')}</div>
              {offers.filter((o) => o.available).length === 0 && <p className="empty">{t('fish.offers_none')}</p>}
              {offers.filter((o) => o.available).map((o) => (
                <div className="card-box" key={o.id}>
                  <b>{o.business || t('sell.default_seller')}</b>
                  <span>{o.price_dzd != null ? `${fmtPrice(o.price_dzd)} ${t('fish.per_kg')}` : t('fish.no_price')}{o.quantity ? ` · ${o.quantity}` : ''}</span>
                  {o.phone && <ContactButtons phone={o.phone} whatsapp={o.whatsapp} text={`${req.item}`} />}
                  <ReportBox type="offer" id={o.id} />
                </div>
              ))}
              <p className="muted small">{t('fish.price_note')}</p>
            </>
          )}

          {!owner && !ended && !mine && seller && <AnswerForm requestId={id} onDone={load} />}
          {!owner && !seller && !mine && <p className="msg info">{t('fish.seller_only_answer')}</p>}
          {!owner && mine && (
            <div className="card-box">
              <b>{t('fish.answered')}: {mine.available ? t('fish.available') : t('fish.unavailable')}</b>
              {mine.available && contact && (
                <>
                  <span className="muted">{t('fish.requester')}</span>
                  <ContactButtons phone={contact.phone} whatsapp={contact.whatsapp} text={req.item} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
