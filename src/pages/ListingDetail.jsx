import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useFavorites } from '../favorites.jsx';
import { arabicError } from '../errors';
import { CONDITIONS, fmtPrice, telLink, waLink } from '../lib/format';
import { publicUrl } from '../lib/images';
import Carousel from '../components/Carousel.jsx';
import Icon from '../components/Icon.jsx';

const SELECT =
  'id, seller_id, seller_name, kind, title, description, price_dzd, length_m, year_built, condition, engine_info, place_text, status, expires_at, wilayas(name_ar), boat_types(name_ar), listing_images(storage_path, sort_order)';

export default function ListingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { ids, toggle } = useFavorites();
  const [item, setItem] = useState(undefined); // undefined = loading, null = not found
  const [contact, setContact] = useState(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    setItem(undefined);
    setContact(undefined);
    supabase.from('listings').select(SELECT).eq('id', id).maybeSingle().then(({ data }) => {
      if (alive) setItem(data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !item) return;
    let alive = true;
    supabase.from('listing_contacts').select('phone, whatsapp').eq('listing_id', item.id).maybeSingle().then(({ data }) => {
      if (alive) setContact(data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [user?.id, item?.id]);

  if (item === undefined) return <p className="muted center" style={{ marginTop: 60 }}>جارٍ التحميل…</p>;
  if (item === null)
    return (
      <div className="needlogin">
        <p>هذا الإعلان غير متاح أو انتهت مدته.</p>
        <Link className="btn" to="/">العودة للرئيسية</Link>
      </div>
    );

  const images = [...item.listing_images].sort((a, b) => a.sort_order - b.sort_order);
  const urls = images.map((i) => publicUrl('listing-images', i.storage_path));
  const mine = user?.id === item.seller_id;
  const faved = ids.has(item.id);
  const here = `/listing/${item.id}`;
  const specs = [
    ['النوع', item.boat_types?.name_ar || (item.kind === 'engine' ? 'محرك' : null)],
    ['الطول', item.length_m ? `${Number(item.length_m)} م` : null],
    ['المحرك', item.engine_info],
    ['سنة الصنع', item.year_built],
    ['الحالة', CONDITIONS[item.condition]],
    ['المكان', item.place_text],
  ].filter(([, v]) => v);

  async function onFav() {
    const ok = await toggle(item.id);
    if (!ok) nav(`/login?next=${encodeURIComponent(here)}`);
  }

  async function sendReport(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: 'اكتب سبب البلاغ (3 أحرف على الأقل).' });
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, listing_id: item.id, reason: reason.trim().slice(0, 500) });
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    setMsg({ type: 'ok', text: 'شكرًا، وصلنا بلاغك وسنراجعه.' });
    setReportOpen(false);
    setReason('');
  }

  return (
    <>
      <div className="detail-top">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="رجوع"><Icon name="back" /></button>
        <button className={`fav ${faved ? 'on' : ''}`} onClick={onFav} aria-label="المفضلة"><Icon name="star" size={20} fill={faved ? 'currentColor' : 'none'} /></button>
        <Carousel urls={urls} />
      </div>

      <div className="sheet">
        <h1>{item.title}</h1>
        <div className="big-price">{fmtPrice(item.price_dzd)}</div>
        <span className="where"><Icon name="pin" size={14} /> {item.wilayas?.name_ar}</span>

        {specs.length > 0 && (
          <div className="specs">
            {specs.map(([k, v]) => (
              <div key={k} className="spec"><small>{k}</small><b>{v}</b></div>
            ))}
          </div>
        )}

        <div className="seller">
          <div className="avatar">{item.seller_name.slice(0, 1).toUpperCase()}</div>
          <div><b>{item.seller_name}</b><div className="muted small">{item.wilayas?.name_ar}</div></div>
        </div>

        {item.description && <p className="desc">{item.description}</p>}

        <div className="safety">
          <b>نصيحة أمان:</b> عاين القارب بنفسك قبل الدفع، ولا تحوّل أي مبلغ مقدمًا لشخص لا تعرفه، وتحقق من أوراق الملكية.
        </div>

        {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</p>}

        {user && !mine && !reportOpen && (
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => setReportOpen(true)}>
            <Icon name="flag" size={14} /> الإبلاغ عن الإعلان
          </button>
        )}
        {reportOpen && (
          <form onSubmit={sendReport} className="box">
            <textarea className="input" placeholder="ما المشكلة في هذا الإعلان؟" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="row2" style={{ marginTop: 10 }}>
              <button className="btn sm">إرسال</button>
              <button type="button" className="btn alt sm" onClick={() => setReportOpen(false)}>إلغاء</button>
            </div>
          </form>
        )}
      </div>

      <div className="cta">
        {mine ? (
          <Link className="btn alt" to="/my-listings">هذا إعلانك — إدارة إعلاناتي</Link>
        ) : !user ? (
          <>
            <Link className="btn" to={`/login?next=${encodeURIComponent(here)}`}><Icon name="phone" color="#fff" />تواصل مع البائع</Link>
            <p className="note">يتطلب تسجيل الدخول للتواصل</p>
          </>
        ) : contact === undefined ? (
          <p className="note">جارٍ تحميل وسائل التواصل…</p>
        ) : contact === null ? (
          <p className="note">لا تتوفر وسيلة تواصل لهذا الإعلان.</p>
        ) : (
          <>
            <a className="btn" href={telLink(contact.phone)}><Icon name="phone" color="#fff" />اتصال</a>
            {contact.whatsapp && (
              <a className="btn wa" href={waLink(contact.whatsapp, `مرحبًا، بخصوص إعلانك «${item.title}» في مرسى`)} target="_blank" rel="noopener noreferrer">
                <Icon name="chat" color="#fff" />واتساب
              </a>
            )}
          </>
        )}
      </div>
    </>
  );
}
