import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { t as tr, useI18n } from '../i18n/index.jsx';
import { errorText } from '../errors';
import { daysLeft, fmtPrice } from '../lib/format';
import { cssUrl, publicUrl, removeFiles } from '../lib/images';
import { coverOf } from '../components/ListingCard.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

const SEL = 'id, title, price_dzd, status, expires_at, listing_images(storage_path, sort_order)';

function state(it) {
  if (it.status === 'sold') return [tr('mine.sold'), ''];
  if (it.status === 'hidden') return [tr('mine.hidden'), 'bad'];
  if (it.status === 'removed') return [tr('mine.removed'), 'bad'];
  const d = daysLeft(it.expires_at);
  return d > 0 ? [tr('mine.active_days', { d }), 'ok'] : [tr('mine.expired'), 'warn'];
}

export default function MyListings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('listings').select(SEL).eq('seller_id', user.id).order('published_at', { ascending: false });
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    setItems(data);
  }, [user?.id]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!user) return <NeedLogin text={t('mine.login')} />;

  async function run(promise, okText) {
    setMsg(null);
    const { error } = await promise;
    if (error) return setMsg({ type: 'err', text: errorText(error) });
    if (okText) setMsg({ type: 'ok', text: okText });
    load();
  }
  const sold = (it) => run(supabase.from('listings').update({ status: 'sold' }).eq('id', it.id), t('mine.marked_sold'));
  const renew = (it) => run(supabase.rpc('renew_listing', { p_id: it.id }), t('mine.renewed'));
  async function del(it) {
    if (!window.confirm(t('mine.confirm_delete'))) return;
    await removeFiles('listing-images', it.listing_images.map((i) => i.storage_path));
    run(supabase.from('listings').delete().eq('id', it.id), t('mine.deleted'));
  }

  return (
    <>
      <div className="topbar"><h2>{t('acc.my_listings')}</h2><Link to="/sell" className="btn sand sm">+ {t('mine.new')}</Link></div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {items === null && !msg && <p className="muted center">{t('common.loading')}</p>}
      {items?.length === 0 && <p className="empty">{t('mine.none')}</p>}
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
                {live && daysLeft(it.expires_at) > 0 && <Link className="mini" to={`/listing/${it.id}`}>{t('mine.view')}</Link>}
                {live && daysLeft(it.expires_at) > 0 && <button className="mini" onClick={() => sold(it)}>{t('mine.sold')}</button>}
                {canRenew && <button className="mini" onClick={() => renew(it)}>{t('mine.renew')}</button>}
                {it.status !== 'removed' && <Link className="mini" to={`/edit-listing/${it.id}`}>{t('edit.button')}</Link>}
                <button className="mini danger" onClick={() => del(it)}>{t('common.delete')}</button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
