import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, fmtDate, fmtPrice } from '../lib/format';
import { parsePrice, splitPrice } from '../lib/price';
import { prepareImage } from '../lib/images';
import { getWilayas } from '../lib/refData';
import {
  MAX_OFFER_IMAGES,
  adminListSponsors,
  clearSponsorsCache,
  removeSponsorImages,
  sponsorImage,
  sponsorState,
  uploadSponsorImages,
} from '../lib/sponsors';
import Icon from './Icon.jsx';
import ImagePicker from './ImagePicker.jsx';
import PriceInput from './PriceInput.jsx';
import { Avatar } from './GuideFeed.jsx';

const DAY = 86400000;
const STATE_TONE = { live: 'ok', scheduled: 'warn', expired: 'bad', paused: 'bad' };
const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const startOfDay = (s) => new Date(`${s}T00:00:00`);
const endOfDay = (s) => new Date(`${s}T23:59:59`);
const num = (v) => (v == null ? 0 : Number(v));

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// ---------- company form ----------
function SponsorForm({ s, wilayas, onDone, onCancel }) {
  const { t } = useI18n();
  const today = toDateInput(new Date());
  const [f, setF] = useState({
    name: s?.name || '',
    tagline: s?.tagline || '',
    description: s?.description || '',
    phone: s?.phone || '',
    whatsapp: s?.whatsapp || '',
    wilayaId: s?.wilaya_id ? String(s.wilaya_id) : '',
    address: s?.address || '',
    start: s ? toDateInput(s.starts_at) : today,
    end: s ? toDateInput(s.ends_at) : toDateInput(Date.now() + 30 * DAY),
    order: s ? String(s.sort_order ?? 0) : '0',
    active: s ? !!s.is_active : true,
  });
  const [logo, setLogo] = useState(null); // { blob, url } of a new logo
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => () => logo && URL.revokeObjectURL(logo.url), [logo]);

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await prepareImage(file);
      setLogo({ blob, url: URL.createObjectURL(blob) });
    } catch (x) {
      setErr(errorText(x));
    }
  }

  async function save(e) {
    e.preventDefault();
    setErr(null);
    const name = f.name.trim();
    if (name.length < 2 || name.length > 100) return setErr(t('sp.v_name'));
    const phone = f.phone ? cleanPhone(f.phone) : null;
    const whatsapp = f.whatsapp ? cleanPhone(f.whatsapp) : null;
    if (!phone && !whatsapp) return setErr(t('sp.v_contact'));
    if (phone && !PHONE_RE.test(phone)) return setErr(t('v.phone'));
    if (whatsapp && !PHONE_RE.test(whatsapp)) return setErr(t('v.whatsapp'));
    if (!f.start || !f.end || endOfDay(f.end) <= startOfDay(f.start)) return setErr(t('sp.v_period'));
    setBusy(true);
    let newLogo = null;
    try {
      if (logo) [newLogo] = await uploadSponsorImages([logo.blob]);
      const row = {
        name,
        tagline: f.tagline.trim().slice(0, 140) || null,
        description: f.description.trim().slice(0, 3000) || null,
        phone,
        whatsapp,
        wilaya_id: f.wilayaId ? Number(f.wilayaId) : null,
        address: f.address.trim().slice(0, 200) || null,
        starts_at: startOfDay(f.start).toISOString(),
        ends_at: endOfDay(f.end).toISOString(),
        sort_order: Number.parseInt(f.order, 10) || 0,
        is_active: f.active,
        ...(newLogo ? { logo_path: newLogo } : {}),
      };
      const { error } = s ? await supabase.from('sponsors').update(row).eq('id', s.id) : await supabase.from('sponsors').insert(row);
      if (error) throw error;
      if (newLogo && s?.logo_path) await removeSponsorImages([s.logo_path]);
    } catch (x) {
      if (newLogo) await removeSponsorImages([newLogo]);
      setBusy(false);
      return setErr(errorText(x));
    }
    setBusy(false);
    onDone();
  }

  const logoUrl = logo?.url || sponsorImage(s?.logo_path);
  return (
    <form onSubmit={save} className="edit-form sp-form" noValidate>
      <div className="sp-logo-pick">
        <button type="button" className="sp-logo-btn" onClick={() => fileRef.current?.click()} aria-label={t('sp.logo')}>
          <Avatar url={logoUrl} name={f.name || '?'} size={64} />
        </button>
        <div>
          <b>{t('sp.logo')}</b>
          <button type="button" className="linkbtn" onClick={() => fileRef.current?.click()}>{logoUrl ? t('av.change') : t('av.add')}</button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickLogo} />
      </div>
      <div className="field"><label>{t('sp.f_name')}</label><input className="input" value={f.name} onChange={set('name')} maxLength={100} /></div>
      <div className="field"><label>{t('sp.f_tagline')}</label><input className="input" value={f.tagline} onChange={set('tagline')} maxLength={140} placeholder={t('sp.f_tagline_ph')} /></div>
      <div className="field"><label>{t('sp.f_description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={3000} /></div>
      <div className="row2">
        <div className="field"><label>{t('field.phone')}</label><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label>{t('contact.whatsapp')}</label><input className="input" dir="ltr" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>{t('field.wilaya')}</label>
          <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
            <option value="">{t('common.choose')}</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
          </select>
        </div>
        <div className="field"><label>{t('sp.f_address')}</label><input className="input" value={f.address} onChange={set('address')} maxLength={200} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>{t('sp.f_start')}</label><input className="input" type="date" value={f.start} onChange={set('start')} /></div>
        <div className="field"><label>{t('sp.f_end')}</label><input className="input" type="date" value={f.end} onChange={set('end')} /></div>
      </div>
      <div className="row2">
        <div className="field"><label>{t('sp.f_order')}</label><input className="input" dir="ltr" inputMode="numeric" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value.replace(/[^\d-]/g, '') })} /></div>
        <label className="sp-check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {t('sp.f_active')}</label>
      </div>
      {err && <p className="msg err">{err}</p>}
      <div className="row2">
        <button className="btn sm" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button>
        <button type="button" className="btn alt sm" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}

// ---------- offer form ----------
function OfferForm({ sponsorId, o, onDone, onCancel }) {
  const { t } = useI18n();
  const currency = o?.price_currency || 'DZD';
  const sp = splitPrice(o?.price_dzd ?? null, currency);
  const [f, setF] = useState({
    title: o?.title || '',
    description: o?.description || '',
    price: sp.text,
    priceUnit: sp.unit,
    currency,
    length: o?.length_m != null ? String(o.length_m) : '',
    engine: o?.engine || '',
    active: o ? !!o.is_active : true,
    order: o ? String(o.sort_order ?? 0) : '0',
  });
  const [images, setImages] = useState(() => (o?.images || []).map((p) => ({ id: p, path: p, url: sponsorImage(p) })));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setErr(null);
    const title = f.title.trim();
    if (title.length < 2 || title.length > 100) return setErr(t('sp.v_title'));
    const price = parsePrice(f.price, f.priceUnit, f.currency);
    if (Number.isNaN(price)) return setErr(t('sell.v_price'));
    const length = f.length.trim() ? Number(f.length.replace(',', '.')) : null;
    if (length != null && !(length > 0 && length <= 200)) return setErr(t('sp.v_length'));
    setBusy(true);
    let uploaded = [];
    try {
      const fresh = images.filter((im) => im.blob);
      uploaded = fresh.length ? await uploadSponsorImages(fresh.map((im) => im.blob)) : [];
      let k = 0;
      const paths = images.map((im) => (im.blob ? uploaded[k++] : im.path));
      const row = {
        sponsor_id: sponsorId,
        title,
        description: f.description.trim().slice(0, 2000) || null,
        price_dzd: price,
        price_currency: f.currency,
        length_m: length,
        engine: f.engine.trim().slice(0, 100) || null,
        images: paths,
        is_active: f.active,
        sort_order: Number.parseInt(f.order, 10) || 0,
      };
      const { error } = o ? await supabase.from('sponsor_offers').update(row).eq('id', o.id) : await supabase.from('sponsor_offers').insert(row);
      if (error) throw error;
      const removed = (o?.images || []).filter((p) => !paths.includes(p));
      if (removed.length) await removeSponsorImages(removed);
    } catch (x) {
      if (uploaded.length) await removeSponsorImages(uploaded);
      setBusy(false);
      return setErr(errorText(x));
    }
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={save} className="edit-form sp-form" noValidate>
      <ImagePicker images={images} setImages={setImages} max={MAX_OFFER_IMAGES} />
      <div className="field"><label>{t('sp.o_title')}</label><input className="input" value={f.title} onChange={set('title')} maxLength={100} placeholder={t('sp.o_title_ph')} /></div>
      <PriceInput value={f} onChange={(v) => setF({ ...f, ...v })} />
      <div className="row2">
        <div className="field"><label>{t('sp.o_length')}</label><input className="input" dir="ltr" inputMode="decimal" value={f.length} onChange={set('length')} maxLength={6} /></div>
        <div className="field"><label>{t('sp.o_engine')}</label><input className="input" value={f.engine} onChange={set('engine')} maxLength={100} /></div>
      </div>
      <div className="field"><label>{t('sp.o_description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={2000} /></div>
      <div className="row2">
        <div className="field"><label>{t('sp.f_order')}</label><input className="input" dir="ltr" inputMode="numeric" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value.replace(/[^\d-]/g, '') })} /></div>
        <label className="sp-check"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {t('sp.o_active')}</label>
      </div>
      {err && <p className="msg err">{err}</p>}
      <div className="row2">
        <button className="btn sm" disabled={busy}>{busy ? t('common.wait') : t('common.save')}</button>
        <button type="button" className="btn alt sm" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  );
}

// ---------- tab ----------
export default function AdminSponsors() {
  const { t } = useI18n();
  const [list, setList] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [editing, setEditing] = useState(null); // 'new' | sponsor id
  const [open, setOpen] = useState(null); // sponsor id whose offers are shown
  const [offerEdit, setOfferEdit] = useState(null); // 'new' | offer id
  const [confirmDel, setConfirmDel] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      setList(await adminListSponsors());
    } catch (x) {
      setList([]);
      setMsg({ type: 'err', text: errorText(x) });
    }
    clearSponsorsCache();
  }, []);

  useEffect(() => {
    load();
    getWilayas().then(setWilayas);
  }, [load]);

  async function run(promise, okText) {
    setMsg(null);
    const { error } = await promise;
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setMsg({ type: 'ok', text: okText });
    load();
  }
  const extend = (s) => {
    const from = Math.max(Date.now(), new Date(s.ends_at).getTime());
    run(supabase.from('sponsors').update({ ends_at: new Date(from + 30 * DAY).toISOString(), is_active: true }).eq('id', s.id), t('sp.extended'));
  };
  const toggle = (s) => run(supabase.from('sponsors').update({ is_active: !s.is_active }).eq('id', s.id), t('admin.updated'));
  async function remove(s) {
    setMsg(null);
    const paths = [s.logo_path, ...(s.sponsor_offers || []).flatMap((o) => o.images || [])].filter(Boolean);
    const { error } = await supabase.from('sponsors').delete().eq('id', s.id);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    await removeSponsorImages(paths);
    setConfirmDel(null);
    setMsg({ type: 'ok', text: t('sp.deleted') });
    load();
  }
  async function removeOffer(o) {
    setMsg(null);
    const { error } = await supabase.from('sponsor_offers').delete().eq('id', o.id);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    await removeSponsorImages(o.images || []);
    setConfirmDel(null);
    load();
  }
  async function copyReport(s) {
    const st = s.stats || {};
    const text = t('sp.report_text', {
      name: s.name,
      impressions: num(st.impressions),
      views: num(st.views),
      calls: num(st.calls),
      whatsapp: num(st.whatsapp),
      total: num(st.total_views),
      end: fmtDate(s.ends_at),
    });
    const ok = await copyText(text);
    setMsg(ok ? { type: 'ok', text: t('sp.report_copied') } : { type: 'err', text: text });
  }

  return (
    <>
      <p className="muted small">{t('sp.admin_help')}</p>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {editing === 'new' ? (
        <div className="box"><SponsorForm wilayas={wilayas} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); setMsg({ type: 'ok', text: t('admin.saved') }); load(); }} /></div>
      ) : (
        <button className="btn" onClick={() => { setEditing('new'); setMsg(null); }}><Icon name="plus" color="#fff" />{t('sp.add')}</button>
      )}
      {list === null && <p className="muted center">{t('common.loading')}</p>}
      {list && list.length === 0 && editing !== 'new' && <p className="empty">{t('sp.none')}</p>}

      {(list || []).map((s) => {
        const state = sponsorState(s);
        const st = s.stats || {};
        return (
          <div key={s.id} className="box sp-admin">
            <div className="admin-head">
              <Avatar url={sponsorImage(s.logo_path)} name={s.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b dir="auto">{s.name}</b>{' '}
                <span className={`pill ${STATE_TONE[state]}`}>{t(`sp.state_${state}`)}</span>
                <div className="muted small">{t('sp.period', { from: fmtDate(s.starts_at), to: fmtDate(s.ends_at) })}</div>
              </div>
            </div>
            <div className="sp-stats" title={t('sp.stats_30')}>
              <span>👁 {num(st.impressions)}<small>{t('sp.st_impressions')}</small></span>
              <span>📄 {num(st.views)}<small>{t('sp.st_views')}</small></span>
              <span>📞 {num(st.calls)}<small>{t('sp.st_calls')}</small></span>
              <span>💬 {num(st.whatsapp)}<small>{t('sp.st_whatsapp')}</small></span>
            </div>
            <div className="muted small">{t('sp.stats_30')}</div>

            {editing === s.id && (
              <SponsorForm s={s} wilayas={wilayas} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); setMsg({ type: 'ok', text: t('admin.saved') }); load(); }} />
            )}

            <div className="mine-actions">
              <button className="mini" onClick={() => { setEditing(editing === s.id ? null : s.id); setMsg(null); }}><Icon name="edit" size={13} /> {t('admin.edit')}</button>
              <button className="mini primary" onClick={() => { setOpen(open === s.id ? null : s.id); setOfferEdit(null); }}>🚤 {t('sp.offers')} ({(s.sponsor_offers || []).length})</button>
              <button className="mini" onClick={() => extend(s)}>{t('sp.extend')}</button>
              <button className="mini" onClick={() => toggle(s)}>{s.is_active ? t('sp.pause') : t('sp.resume')}</button>
              <button className="mini" onClick={() => copyReport(s)}>📋 {t('sp.copy_report')}</button>
              <Link className="mini" to={`/sponsor/${s.id}`}>{t('mine.view')}</Link>
              {confirmDel === s.id ? (
                <button className="mini danger" onClick={() => remove(s)}>{t('sp.confirm_delete')}</button>
              ) : (
                <button className="mini danger" onClick={() => setConfirmDel(s.id)}>{t('common.delete')}</button>
              )}
            </div>

            {open === s.id && (
              <div className="sp-offers-admin">
                {(s.sponsor_offers || []).map((o) => (
                  <div key={o.id} className="sp-offer-row">
                    {offerEdit === o.id ? (
                      <OfferForm sponsorId={s.id} o={o} onCancel={() => setOfferEdit(null)} onDone={() => { setOfferEdit(null); setMsg({ type: 'ok', text: t('admin.saved') }); load(); }} />
                    ) : (
                      <>
                        <div className="sp-offer-line">
                          <div className="sp-thumb" style={o.images?.[0] ? { backgroundImage: `url("${sponsorImage(o.images[0])}")` } : undefined} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b dir="auto">{o.title}</b>{!o.is_active && <span className="pill bad"> {t('sp.hidden')}</span>}
                            <div className="muted small">{o.price_dzd != null ? fmtPrice(o.price_dzd, o.price_currency) : t('sp.price_ask')} · {(o.images || []).length === 1 ? t('sp.one_photo') : t('sp.n_photos', { n: (o.images || []).length })}</div>
                          </div>
                        </div>
                        <div className="mine-actions">
                          <button className="mini" onClick={() => setOfferEdit(o.id)}><Icon name="edit" size={13} /> {t('admin.edit')}</button>
                          {confirmDel === o.id ? (
                            <button className="mini danger" onClick={() => removeOffer(o)}>{t('sp.confirm_delete')}</button>
                          ) : (
                            <button className="mini danger" onClick={() => setConfirmDel(o.id)}>{t('common.delete')}</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {offerEdit === 'new' ? (
                  <OfferForm sponsorId={s.id} onCancel={() => setOfferEdit(null)} onDone={() => { setOfferEdit(null); setMsg({ type: 'ok', text: t('admin.saved') }); load(); }} />
                ) : (
                  <button className="btn alt sm" onClick={() => setOfferEdit('new')}><Icon name="plus" />{t('sp.add_offer')}</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
