import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { arabicError } from '../errors';
import { mapsLink, telLink, waLink } from '../lib/format';
import { publicUrl } from '../lib/images';
import Carousel from '../components/Carousel.jsx';
import Icon from '../components/Icon.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';
import ProfileTabs from '../components/ProfileTabs.jsx';

const SELECT = 'id, owner_id, pro_type, verified_at, business_name, description, address, latitude, longitude, wilayas(name_ar), guide_categories(name_ar), professional_images(storage_path, sort_order)';

export default function ProDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(undefined);
  const [contact, setContact] = useState(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    setItem(undefined);
    setContact(undefined);
    supabase.from('professional_profiles').select(SELECT).eq('id', id).maybeSingle().then(({ data }) => {
      if (alive) setItem(data ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !item) return;
    let alive = true;
    supabase.from('professional_contacts').select('phone, whatsapp').eq('professional_id', item.id).maybeSingle().then(({ data }) => {
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
        <p>هذا النشاط غير متاح حاليًا.</p>
        <Link className="btn" to="/">العودة للرئيسية</Link>
      </div>
    );

  const urls = [...item.professional_images].sort((a, b) => a.sort_order - b.sort_order).map((i) => publicUrl('pro-images', i.storage_path));
  const here = `/pro/${item.id}`;
  const mine = user?.id === item.owner_id;
  const isBusiness = item.pro_type !== 'fisherman';

  async function sendReport(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setMsg({ type: 'err', text: 'اكتب سبب البلاغ (3 أحرف على الأقل).' });
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, professional_id: item.id, reason: reason.trim().slice(0, 500) });
    if (error) return setMsg({ type: 'err', text: arabicError(error) });
    setMsg({ type: 'ok', text: 'شكرًا، وصلنا بلاغك وسنراجعه.' });
    setReportOpen(false);
    setReason('');
  }

  return (
    <>
      <div className="detail-top">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="رجوع"><Icon name="back" /></button>
        <Carousel urls={urls} />
      </div>
      <div className="sheet">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.business_name}
          {isBusiness && item.verified_at && <VerifiedBadge size={22} />}
        </h1>
        <span className="pill">{item.guide_categories?.name_ar}</span>
        <span className="where"><Icon name="pin" size={14} /> {item.wilayas?.name_ar}{item.address ? ` · ${item.address}` : ''}</span>
        {item.description && <p className="desc">{item.description}</p>}
        {item.latitude != null && (
          <a className="btn alt" style={{ marginTop: 14 }} href={mapsLink(item.latitude, item.longitude)} target="_blank" rel="noopener noreferrer"><Icon name="pin" />الموقع على الخريطة</a>
        )}
        {msg && <p className={`msg ${msg.type}`} style={{ marginTop: 12 }}>{msg.text}</p>}
        {user && !mine && !reportOpen && (
          <button className="linkbtn" style={{ marginTop: 14 }} onClick={() => setReportOpen(true)}><Icon name="flag" size={14} /> الإبلاغ عن النشاط</button>
        )}
        {reportOpen && (
          <form onSubmit={sendReport} className="box">
            <textarea className="input" placeholder="ما المشكلة؟" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
            <div className="row2" style={{ marginTop: 10 }}>
              <button className="btn sm">إرسال</button>
              <button type="button" className="btn alt sm" onClick={() => setReportOpen(false)}>إلغاء</button>
            </div>
          </form>
        )}

        {/* Tabs: products & services + work portfolio (businesses only) */}
        <ProfileTabs ownerId={item.owner_id} showPortfolio={isBusiness} />
      </div>

      <div className="cta">
        {!user ? (
          <>
            <Link className="btn" to={`/login?next=${encodeURIComponent(here)}`}><Icon name="phone" color="#fff" />تواصل</Link>
            <p className="note">يتطلب تسجيل الدخول للتواصل</p>
          </>
        ) : contact === undefined ? (
          <p className="note">جارٍ تحميل وسائل التواصل…</p>
        ) : contact === null ? (
          <p className="note">لا تتوفر وسيلة تواصل.</p>
        ) : (
          <>
            <a className="btn" href={telLink(contact.phone)}><Icon name="phone" color="#fff" />اتصال</a>
            {contact.whatsapp && (
              <a className="btn wa" href={waLink(contact.whatsapp, `مرحبًا، رأيت نشاطكم «${item.business_name}» في مرسى`)} target="_blank" rel="noopener noreferrer"><Icon name="chat" color="#fff" />واتساب</a>
            )}
          </>
        )}
      </div>
    </>
  );
}
