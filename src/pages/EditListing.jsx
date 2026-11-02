import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { PHONE_RE, cleanPhone, isMissingSchema } from '../lib/format';
import { removeFiles } from '../lib/images';
import { GEAR_TYPES } from '../lib/safety';
import NeedLogin from '../components/NeedLogin.jsx';
import Icon from '../components/Icon.jsx';

const YEAR = new Date().getFullYear();
const SEL = 'id, seller_id, kind, boat_type_id, title, description, price_dzd, length_m, year_built, engine_info, wilaya_id, place_text, condition';

// The owner edits his own listing (the photos stay as they are) or deletes it.
export default function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [item, setItem] = useState(undefined);
  const [f, setF] = useState(null);
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('boat_types').select('*').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      let res = await supabase.from('listings').select(`${SEL}, gear_type`).eq('id', id).maybeSingle();
      if (res.error && isMissingSchema(res.error)) res = await supabase.from('listings').select(SEL).eq('id', id).maybeSingle();
      const row = res.data;
      if (!alive) return;
      if (!row || row.seller_id !== user.id) return setItem(null);
      const c = await supabase.from('listing_contacts').select('phone, whatsapp').eq('listing_id', row.id).maybeSingle();
      if (!alive) return;
      setItem(row);
      setF({
        title: row.title || '',
        price: row.price_dzd != null ? String(row.price_dzd) : '',
        condition: row.condition || '',
        typeId: row.boat_type_id != null ? String(row.boat_type_id) : '',
        length: row.length_m != null ? String(row.length_m) : '',
        year: row.year_built != null ? String(row.year_built) : '',
        engine: row.engine_info || '',
        wilayaId: row.wilaya_id != null ? String(row.wilaya_id) : '',
        place: row.place_text || '',
        description: row.description || '',
        gearType: GEAR_TYPES.includes(row.gear_type) ? row.gear_type : 'product',
        phone: c.data?.phone || '',
        whatsapp: c.data?.whatsapp || '',
      });
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, id]);

  if (!user) return <NeedLogin text={t('sell.login')} />;
  if (item === undefined) return <p className="muted center">{t('common.loading')}</p>;
  if (item === null) return <p className="empty">{t('edit.not_yours')}</p>;

  const isBoat = item.kind === 'boat';
  const isGear = item.kind === 'gear';
  const hasYear = isBoat || item.kind === 'engine';

  function validate() {
    if (isBoat && !f.typeId) return t('sell.v_type');
    const tt = f.title.trim();
    if (tt.length < 5 || tt.length > 120) return t('sell.v_title');
    if (f.price && (!/^\d{1,12}$/.test(f.price) || Number(f.price) <= 0)) return t('sell.v_price');
    if (isBoat && f.length) {
      const n = Number(f.length.replace(',', '.'));
      if (!(n >= 1 && n <= 400)) return t('sell.v_length');
    }
    if (hasYear && f.year) {
      const y = Number(f.year);
      if (!Number.isInteger(y) || y < 1900 || y > YEAR + 1) return t('sell.v_year');
    }
    if (!f.wilayaId) return t('v.wilaya');
    if (f.phone && !PHONE_RE.test(cleanPhone(f.phone))) return t('v.phone');
    if (f.whatsapp && !PHONE_RE.test(cleanPhone(f.whatsapp))) return t('v.whatsapp');
    return null;
  }

  async function save(e) {
    e.preventDefault();
    setMsg(null);
    const problem = validate();
    if (problem) return setMsg({ type: 'err', text: problem });
    setBusy(true);
    const { error } = await supabase.rpc('update_my_listing', {
      p_id: String(item.id),
      p_title: f.title.trim(),
      p_description: f.description.trim().slice(0, 4000),
      p_price: f.price ? Number(f.price) : null,
      p_wilaya_id: Number(f.wilayaId),
      p_place: f.place.trim(),
      p_condition: f.condition || null,
      p_boat_type_id: isBoat && f.typeId ? Number(f.typeId) : null,
      p_length: isBoat && f.length ? Number(f.length.replace(',', '.')) : null,
      p_year: hasYear && f.year ? Number(f.year) : null,
      p_engine: hasYear ? f.engine.trim() : null,
      p_gear_type: isGear ? f.gearType : null,
      p_phone: f.phone ? cleanPhone(f.phone) : null,
      p_whatsapp: f.whatsapp ? cleanPhone(f.whatsapp) : null,
    });
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: isMissingSchema(error) ? t('edit.unavailable') : errorText(error) });
    nav(`/listing/${item.id}`, { replace: true });
  }

  async function remove() {
    if (!window.confirm(t('mine.confirm_delete'))) return;
    setBusy(true);
    const imgs = await supabase.from('listing_images').select('storage_path').eq('listing_id', item.id);
    await removeFiles('listing-images', (imgs.data || []).map((i) => i.storage_path));
    const { error } = await supabase.from('listings').delete().eq('id', item.id);
    setBusy(false);
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    nav('/my-listings', { replace: true });
  }

  return (
    <>
      <div className="topbar"><h2>{t('edit.listing_title')}</h2></div>
      <p className="muted small">{t('edit.photos_note')}</p>
      <form onSubmit={save} noValidate>
        {isBoat && (
          <div className="field"><label>{t('sell.boat_type')}</label>
            <select className="input" value={f.typeId} onChange={set('typeId')}>
              <option value="">{t('common.choose')}</option>
              {types.map((x) => <option key={x.id} value={x.id}>{boatTypeName(x)}</option>)}
            </select>
          </div>
        )}
        {isGear && (
          <div className="field"><label>{t('sell.gear_type')}</label>
            <div className="seg seg3">
              {GEAR_TYPES.map((g) => (
                <button key={g} type="button" className={`btn ${f.gearType === g ? '' : 'alt'} sm`} onClick={() => setF({ ...f, gearType: g })}>{t(`gear.${g}`)}</button>
              ))}
            </div>
          </div>
        )}
        <div className="field"><label>{isGear ? t('sell.gear_name') : t('sell.ad_title')}</label><input className="input" value={f.title} onChange={set('title')} maxLength={120} /></div>
        <div className="row2">
          <div className="field"><label>{t('sell.price')}</label><input className="input" inputMode="numeric" value={f.price} onChange={set('price')} maxLength={12} placeholder={t('sell.price_hint')} /></div>
          <div className="field"><label>{t('spec.condition')}</label>
            <select className="input" value={f.condition} onChange={set('condition')}>
              <option value="">{t('cond.unset')}</option><option value="new">{t('cond.new')}</option><option value="used">{t('cond.used')}</option>
            </select>
          </div>
        </div>
        {hasYear && (
          <div className="row2">
            {isBoat && <div className="field"><label>{t('sell.length')}</label><input className="input" inputMode="decimal" value={f.length} onChange={set('length')} maxLength={6} /></div>}
            <div className="field"><label>{t('spec.year')}</label><input className="input" inputMode="numeric" value={f.year} onChange={set('year')} maxLength={4} /></div>
          </div>
        )}
        {hasYear && (
          <div className="field"><label>{t('spec.engine')}</label><input className="input" value={f.engine} onChange={set('engine')} maxLength={200} placeholder={t('sell.engine_hint')} /></div>
        )}
        <div className="row2">
          <div className="field"><label>{t('field.wilaya')}</label>
            <select className="input" value={f.wilayaId} onChange={set('wilayaId')}>
              <option value="">{t('common.choose')}</option>
              {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('sell.place')}</label><input className="input" value={f.place} onChange={set('place')} maxLength={150} /></div>
        </div>
        <div className="field"><label>{t('field.description')}</label><textarea className="input" value={f.description} onChange={set('description')} maxLength={4000} /></div>

        <div className="section-title">{t('field.contacts')}</div>
        <div className="row2">
          <div className="field"><label>{t('field.phone')}</label><input className="input" inputMode="tel" dir="ltr" value={f.phone} onChange={set('phone')} placeholder="05XXXXXXXX" /></div>
          <div className="field"><label>{t('field.whatsapp_opt')}</label><input className="input" inputMode="tel" dir="ltr" value={f.whatsapp} onChange={set('whatsapp')} placeholder="05XXXXXXXX" /></div>
        </div>

        {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn sand" disabled={busy}>{busy ? t('common.wait') : t('edit.save')}</button>
        <button type="button" className="btn danger" style={{ marginTop: 10 }} disabled={busy} onClick={remove}><Icon name="trash" color="#fff" />{t('edit.delete_listing')}</button>
        <Link to="/my-listings" className="btn alt" style={{ marginTop: 10 }}>{t('common.back')}</Link>
      </form>
    </>
  );
}
