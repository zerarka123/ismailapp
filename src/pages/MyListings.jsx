import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { daysLeft, fmtPrice } from '../lib/format';
import { cssUrl, publicUrl, removeFiles } from '../lib/images';
import { coverOf } from '../components/ListingCard.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

const SEL = 'id, title, price_dzd, status, expires_at, listing_images(storage_path, sort_order)';

function state(it) {
  if (it.status === 'sold') return ['تم البيع', ''];
  if (it.status === 'hidden') return ['مخفي من الإدارة', 'bad'];
  if (it.status === 'removed') return ['محذوف', 'bad'];
  const d = daysLeft(it.expires_at);
  return d > 0 ? [`نشط · ${d} يومًا متبقيًا`, 'ok'] : ['انتهت المدة', 'warn'];
}

export default function MyListings() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('listings').select(SEL).eq('seller_id', user.id).order('published_at', { ascending: false });
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    setItems(data);
  }, [user?.id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return <NeedLogin text="سجّل الدخول لإدارة إعلاناتك." />;

  async function run(promise, okText) {
    setMsg(null);
    const { error } = await promise;
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    if (okText) setMsg({ type: 'ok', text: okText });
    load();
  }
  const sold = (it) => run(supabase.from('listings').update({ status: 'sold' }).eq('id', it.id), 'تم تعليم الإعلان كمباع.');
  const renew = (it) => run(supabase.rpc('renew_listing', { p_id: it.id }), 'تم تجديد الإعلان.');
  async function del(it) {
    if (!window.confirm('هل تريد حذف هذا الإعلان نهائيًا؟')) return;
    await removeFiles('listing-images', it.listing_images.map((i) => i.storage_path));
    run(supabase.from('listings').delete().eq('id', it.id), 'تم حذف الإعلان.');
  }

  return (
    <>
      <div className="topbar"><h2>إعلاناتي</h2><Link to="/sell" className="btn sand sm">+ جديد</Link></div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {items === null && !msg && <p className="muted center">جارٍ التحميل…</p>}
      {items?.length === 0 && <p className="empty">لم تنشر أي إعلان بعد.</p>}
      {items?.map((it) => {
        const [label, tone] = state(it);
        const cover = coverOf(it.listing_images);
        const live = it.status === 'published';
        const canRenew = live && daysLeft(it.expires_at) <= 7;
        return (
          <div key={it.id} className="mine">
            <div className="mine-img" style={cover ? { backgroundImage: cssUrl(publicUrl('listing-images', cover.storage_path)) } : undefined} />
            <div className="mine-info">
              <h4>{it.title}</h4>
              <div className="muted small">{fmtPrice(it.price_dzd)}</div>
              <span className={`pill ${tone}`}>{label}</span>
              <div className="mine-actions">
                {live && daysLeft(it.expires_at) > 0 && <Link className="mini" to={`/listing/${it.id}`}>عرض</Link>}
                {live && daysLeft(it.expires_at) > 0 && <button className="mini" onClick={() => sold(it)}>تم البيع</button>}
                {canRenew && <button className="mini" onClick={() => renew(it)}>تجديد</button>}
                <button className="mini danger" onClick={() => del(it)}>حذف</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
