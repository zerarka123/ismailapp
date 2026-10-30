import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n/index.jsx';
import { categoryName, wilayaName } from '../i18n/names.js';
import { notificationText, useNotifications } from '../notifications.jsx';
import { PUSH_ENABLED } from '../config';
import { errorText } from '../errors';
import { fmtDate, isMissingSchema } from '../lib/format';
import { isNative, registerNativePush, webNotifySupported } from '../lib/push';
import Icon from '../components/Icon.jsx';
import NeedLogin from '../components/NeedLogin.jsx';

const KINDS = ['boat', 'engine', 'equipment', 'job_offer', 'job_request'];
const DEFAULT_PREFS = { enabled: true, kinds: ['boat', 'engine', 'equipment'], category_ids: [], wilaya_id: null };

function Inbox() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { refresh, markAllRead } = useNotifications();
  const [rows, setRows] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('id, type, params, path, created_at, read_at').order('created_at', { ascending: false }).limit(50);
    setRows(data || []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function open(n) {
    if (!n.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
      refresh();
    }
    if (n.path && n.path.startsWith('/')) nav(n.path);
  }

  return (
    <>
      <div className="row-between">
        <div className="section-title">{t('notif.inbox')}</div>
        {rows?.some((n) => !n.read_at) && <button className="linkbtn" onClick={() => markAllRead().then(load)}>{t('notif.mark_all')}</button>}
      </div>
      {rows === null && <p className="muted center">{t('common.loading')}</p>}
      {rows?.length === 0 && <p className="empty">{t('notif.empty')}</p>}
      <div className="menu">
        {rows?.map((n) => {
          const { title, body } = notificationText(n);
          return (
            <button key={n.id} className={`notif ${n.read_at ? '' : 'unread'}`} onClick={() => open(n)}>
              <Icon name="bell" color={n.read_at ? '#51708a' : '#0A6EB4'} />
              <span className="notif-text">
                <b>{title}</b>
                {body && <span>{body}</span>}
                <small>{fmtDate(n.created_at)}</small>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Preferences({ user }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState(null);
  const [cats, setCats] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [native, setNative] = useState(false);
  const [perm, setPerm] = useState(webNotifySupported() ? Notification.permission : 'unsupported');

  useEffect(() => {
    isNative().then(setNative);
    supabase.from('notification_prefs').select('enabled, kinds, category_ids, wilaya_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setPrefs(data || DEFAULT_PREFS));
    supabase.from('guide_categories').select('*').order('sort_order').then(({ data }) => setCats(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, [user.id]);

  if (!prefs) return <p className="muted center">{t('common.loading')}</p>;

  const toggleIn = (key, v) => {
    const list = prefs[key] || [];
    setPrefs({ ...prefs, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from('notification_prefs').upsert({
      user_id: user.id,
      enabled: prefs.enabled,
      kinds: prefs.kinds,
      category_ids: prefs.category_ids.map(Number),
      wilaya_id: prefs.wilaya_id ? Number(prefs.wilaya_id) : null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    setMsg(error ? { type: 'err', text: errorText(error) } : { type: 'ok', text: t('notif.saved') });
  }

  async function enableDevice() {
    if (native) {
      const ok = await registerNativePush((path) => nav(path));
      setMsg(ok ? { type: 'ok', text: t('notif.device_on') } : { type: 'err', text: t(PUSH_ENABLED ? 'notif.device_denied' : 'notif.push_not_configured') });
      return;
    }
    const p = await Notification.requestPermission();
    setPerm(p);
    setMsg(p === 'granted' ? { type: 'ok', text: t('notif.device_on') } : { type: 'err', text: t('notif.device_denied') });
  }

  const sections = ['marine', 'fisher'];
  return (
    <>
      <div className="section-title">{t('notif.prefs')}</div>
      <div className="box">
        <label className="check">
          <input type="checkbox" checked={prefs.enabled} onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })} />
          {t('notif.enabled')}
        </label>
        {(native || perm !== 'unsupported') && perm !== 'granted' && (
          <button type="button" className="btn alt sm" style={{ width: '100%', marginTop: 10 }} onClick={enableDevice}><Icon name="bell" />{t('notif.enable_device')}</button>
        )}
        {!native && perm === 'granted' && <p className="muted small" style={{ marginBottom: 0 }}>✓ {t('notif.device_on')}</p>}
      </div>

      <div className="box">
        <b>{t('notif.market')}</b>
        <p className="muted small">{t('notif.market_help')}</p>
        <div className="checks">
          {KINDS.map((k) => (
            <label key={k} className="check">
              <input type="checkbox" checked={prefs.kinds.includes(k)} onChange={() => toggleIn('kinds', k)} disabled={!prefs.enabled} />
              {t(`notif.kind_${k}`)}
            </label>
          ))}
        </div>
      </div>

      <div className="box">
        <b>{t('notif.branches')}</b>
        <p className="muted small">{t('notif.branches_help')}</p>
        {sections.map((s) => (
          <div key={s}>
            <div className="muted small" style={{ fontWeight: 700, marginTop: 8 }}>{t(`guide.${s}`)}</div>
            <div className="checks">
              {cats.filter((c) => c.section === s).map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" checked={prefs.category_ids.map(Number).includes(Number(c.id))} onChange={() => toggleIn('category_ids', Number(c.id))} disabled={!prefs.enabled} />
                  {categoryName(c)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label>{t('notif.wilaya')}</label>
        <select className="input" value={prefs.wilaya_id || ''} onChange={(e) => setPrefs({ ...prefs, wilaya_id: e.target.value || null })} disabled={!prefs.enabled}>
          <option value="">{t('common.all_wilayas')}</option>
          {wilayas.map((w) => <option key={w.id} value={w.id}>{wilayaName(w)}</option>)}
        </select>
      </div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      <button className="btn" disabled={busy} onClick={save}>{busy ? t('common.wait') : t('common.save')}</button>
    </>
  );
}

export default function Notifications() {
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const { available } = useNotifications();
  const [tab, setTab] = useState('inbox');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('notification_prefs').select('user_id').limit(1).then(({ error }) => setMissing(!!error && isMissingSchema(error)));
  }, [user?.id]);

  if (!user) return <NeedLogin text={t('notif.login')} />;

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label={t('common.back')}><Icon name="back" /></button>
        <h2>{t('notif.title')}</h2>
      </div>
      {(!available || missing) ? (
        <p className="msg info">{t('admin.needs_migration')}</p>
      ) : (
        <>
          <div className="seg">
            <button className={`btn sm ${tab === 'inbox' ? '' : 'alt'}`} onClick={() => setTab('inbox')}>{t('notif.inbox')}</button>
            <button className={`btn sm ${tab === 'prefs' ? '' : 'alt'}`} onClick={() => setTab('prefs')}>{t('notif.prefs')}</button>
          </div>
          {tab === 'inbox' ? <Inbox /> : <Preferences user={user} />}
        </>
      )}
    </>
  );
}
