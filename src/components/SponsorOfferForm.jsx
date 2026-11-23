import { useState } from 'react';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import { parsePrice, splitPrice } from '../lib/price';
import { MAX_OFFER_IMAGES, removeSponsorImages, sponsorImage } from '../lib/sponsors';
import ImagePicker from './ImagePicker.jsx';
import PriceInput from './PriceInput.jsx';

// Add / edit one offer of "عروض المصنّعين". Used by the admin (photos → announcements/sponsors/) and by the
// company itself (photos → its own folder of pro-images): `upload(blobs)` returns the stored paths.
// The database refuses an offer over the company's quota ("offer_limit"), shown as a clear message.
export default function SponsorOfferForm({ sponsorId, o, upload, onDone, onCancel, showOrder = true }) {
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
      uploaded = fresh.length ? await upload(fresh.map((im) => im.blob)) : [];
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
        {showOrder ? (
          <div className="field"><label>{t('sp.f_order')}</label><input className="input" dir="ltr" inputMode="numeric" value={f.order} onChange={(e) => setF({ ...f, order: e.target.value.replace(/[^\d-]/g, '') })} /></div>
        ) : <span />}
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
