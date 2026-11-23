import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import { fmtDate, fmtPrice } from '../lib/format';
import { goBack } from '../lib/goBack.js';
import { clearSponsorsCache, mySponsor, mySponsorStats, removeSponsorImages, sponsorImage, sponsorState, uploadOwnerImages } from '../lib/sponsors';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import SponsorOfferForm from '../components/SponsorOfferForm.jsx';

const STATE_TONE = { live: 'ok', scheduled: 'warn', expired: 'bad', paused: 'bad' };
const num = (v) => (v == null ? 0 : Number(v));

// "عروضي المميّزة": the company of a guide account posts its own "عروض المصنّعين", up to the number the admin
// gave it. The database enforces the limit; the page shows how many are left and the last 30 days' numbers.
export default function MySponsorOffers() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [s, setS] = useState(undefined);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | offer id
  const [confirmDel, setConfirmDel] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const d = await mySponsor(user.id);
      setS(d);
      if (d) mySponsorStats().then(setStats, () => setStats(null));
    } catch (x) {
      setS(null);
      setMsg({ type: 'err', text: errorText(x) });
    }
    clearSponsorsCache();
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return <NeedLogin />;
  if (s === undefined) return <p className="muted center" style={{ marginTop: 60 }}>{t('common.loading')}</p>;

  const top = (
    <div className="topbar">
      <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
      <h2>{t('sp.my_title')}</h2>
    </div>
  );
  if (!s)
    return (
      <>
        {top}
        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <div className="needlogin">
          <p>{t('sp.my_none')}</p>
          <Link className="btn" to="/support">{t('support.title')}</Link>
        </div>
      </>
    );

  const offers = s.sponsor_offers || [];
  const used = offers.length;
  const left = Math.max(0, num(s.max_offers) - used);
  const state = sponsorState(s);
  const upload = (blobs) => uploadOwnerImages(user.id, blobs);

  async function remove(o) {
    setMsg(null);
    const { error } = await supabase.from('sponsor_offers').delete().eq('id', o.id);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    await removeSponsorImages(o.images || []);
    setConfirmDel(null);
    setMsg({ type: 'ok', text: t('sp.offer_deleted') });
    load();
  }
  const done = () => {
    setEditing(null);
    setMsg({ type: 'ok', text: t('admin.saved') });
    load();
  };

  return (
    <>
      {top}
      <section className="box sp-mine">
        <div className="admin-head">
          <b dir="auto" style={{ flex: 1 }}>{s.name}</b>
          <span className={`pill ${STATE_TONE[state]}`}>{t(`sp.state_${state}`)}</span>
        </div>
        <div className="muted small">{t('sp.period', { from: fmtDate(s.starts_at), to: fmtDate(s.ends_at) })}</div>
        <div className="sp-quota">
          <div className="sp-quota-bar"><span style={{ width: `${s.max_offers ? Math.min(100, (used / s.max_offers) * 100) : 100}%` }} /></div>
          <b>{t('sp.quota_used', { used, max: num(s.max_offers) })}</b>
        </div>
        <div className="sp-stats">
          <span>👁 {num(stats?.impressions)}<small>{t('sp.st_impressions')}</small></span>
          <span>📄 {num(stats?.views)}<small>{t('sp.st_views')}</small></span>
          <span>📞 {num(stats?.calls)}<small>{t('sp.st_calls')}</small></span>
          <span>💬 {num(stats?.whatsapp)}<small>{t('sp.st_whatsapp')}</small></span>
        </div>
        <div className="muted small">{t('sp.stats_30')}</div>
        {state !== 'live' && <p className="msg warn" style={{ marginBottom: 0 }}>{t('sp.my_not_live')}</p>}
        <Link className="mini" to={`/sponsor/${s.id}`} style={{ alignSelf: 'flex-start', marginTop: 10 }}>{t('sp.my_see_page')}</Link>
      </section>

      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}

      <div className="section-title">{t('sp.offers')}</div>
      {offers.length === 0 && editing !== 'new' && <p className="empty">{t('sp.my_empty')}</p>}
      {offers.map((o) => (
        <div key={o.id} className="box sp-offer-row">
          {editing === o.id ? (
            <SponsorOfferForm sponsorId={s.id} o={o} upload={upload} showOrder={false} onCancel={() => setEditing(null)} onDone={done} />
          ) : (
            <>
              <div className="sp-offer-line">
                <div className="sp-thumb" style={o.images?.[0] ? { backgroundImage: `url("${sponsorImage(o.images[0])}")` } : undefined} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b dir="auto">{o.title}</b>{!o.is_active && <span className="pill bad"> {t('sp.hidden')}</span>}
                  <div className="muted small">{o.price_dzd != null ? fmtPrice(o.price_dzd, o.price_currency) : t('sp.price_ask')}</div>
                </div>
              </div>
              <div className="mine-actions">
                <button className="mini" onClick={() => { setEditing(o.id); setMsg(null); }}><Icon name="edit" size={13} /> {t('admin.edit')}</button>
                {confirmDel === o.id ? (
                  <button className="mini danger" onClick={() => remove(o)}>{t('sp.confirm_delete')}</button>
                ) : (
                  <button className="mini danger" onClick={() => setConfirmDel(o.id)}>{t('common.delete')}</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {editing === 'new' ? (
        <div className="box"><SponsorOfferForm sponsorId={s.id} upload={upload} showOrder={false} onCancel={() => setEditing(null)} onDone={done} /></div>
      ) : left > 0 ? (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => { setEditing('new'); setMsg(null); }}><Icon name="plus" color="#fff" />{t('sp.add_offer')} · {t('sp.left', { n: left })}</button>
      ) : (
        <p className="msg warn">{t('sp.limit_reached')}</p>
      )}
    </>
  );
}
