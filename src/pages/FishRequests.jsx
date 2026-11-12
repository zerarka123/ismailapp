import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { wilayaName } from '../i18n/names.js';
import { timeAgo } from '../lib/fish';
import { goBack } from '../lib/goBack.js';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';
import { getWilayas } from '../lib/refData';

export function RequestRow({ r, wilayas }) {
  const { t } = useI18n();
  const w = wilayas.find((x) => x.id === r.wilaya_id);
  return (
    <Link to={`/fish/requests/${r.id}`} className="rrow">
      <div className="rrow-top">
        <b>{r.item}</b>
        <span className={`urg ${r.urgency}`}>{t(`fish.urg_${r.urgency}`)}</span>
      </div>
      <span className="muted">{[r.quantity, r.commune, w ? wilayaName(w) : ''].filter(Boolean).join(' · ')}</span>
      <span className="muted small">{timeAgo(r.created_at, t)}</span>
    </Link>
  );
}

export default function FishRequests() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState('mine');
  const [seller, setSeller] = useState(false);
  const [wilayas, setWilayas] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWilayas().then(setWilayas);
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.rpc('is_fish_seller', { p_uid: user.id }).then(({ data }) => {
      setSeller(!!data);
      if (data) setTab('incoming');
    });
  }, [user?.id]);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError(false);
    let q = supabase.from('fish_requests').select('id, item, quantity, commune, wilaya_id, urgency, created_at, expires_at, status').order('created_at', { ascending: false }).limit(60);
    q = tab === 'mine' ? q.eq('user_id', user.id) : q.neq('user_id', user.id).eq('status', 'open').gt('expires_at', new Date().toISOString());
    const { data, error: err } = await q;
    if (err) setError(true);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tab, user?.id]);

  if (!user) return <NeedLogin text={t('fish.login_contact')} />;
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => goBack(nav)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('fish.req_title')}</h2>
      </div>
      <Link to="/fish/requests/new" className="btn sand" style={{ marginBottom: 14 }}><Icon name="plus" />{t('fish.req_new')}</Link>
      {seller && (
        <div className="seg">
          <button className={`btn sm ${tab === 'incoming' ? '' : 'alt'}`} onClick={() => setTab('incoming')}>{t('fish.req_incoming')}</button>
          <button className={`btn sm ${tab === 'mine' ? '' : 'alt'}`} onClick={() => setTab('mine')}>{t('fish.req_mine')}</button>
        </div>
      )}
      {loading && <p className="muted center">{t('common.loading')}</p>}
      {error && <p className="msg err">{t('common.load_failed')} <button className="linkbtn" onClick={load}>{t('common.retry')}</button></p>}
      {!loading && !error && rows.length === 0 && <p className="empty">{tab === 'mine' ? t('fish.req_empty') : t('fish.req_empty_in')}</p>}
      <div className="rlist">{rows.map((r) => <RequestRow key={r.id} r={r} wilayas={wilayas} />)}</div>
    </>
  );
}
