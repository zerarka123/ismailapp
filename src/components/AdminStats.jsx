import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { categoryName } from '../i18n/names.js';
import { errorText } from '../errors';
import { fmtDate, isMissingSchema } from '../lib/format';
import { timeAgo } from '../lib/fish';
import { getGuideCategories } from '../lib/refData';
import { HIDDEN_BRANCHES } from '../lib/branches';

// Admin tab «الإحصائيات»: is the app used? Visits, regular users, retention, and taps on call / WhatsApp
// per branch. Every figure is computed in the database (migration 014): this screen only receives totals.

const PERIODS = [1, 7, 30, 90];
const USERS_PAGE = 30;
const SPECIAL_BRANCHES = ['market', 'fish_requests', 'jobs', 'other'];

const fmtN = (n) => `⁦${Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ')}⁩`;
const pct = (a, b) => (b > 0 ? Math.round((100 * a) / b) : null);
const pctText = (a, b) => {
  const p = pct(a, b);
  return p == null ? '—' : `${p}%`;
};

function useBranchLabel() {
  const { t } = useI18n();
  const [cats, setCats] = useState([]);
  useEffect(() => {
    getGuideCategories().then((c) => setCats(c || []));
  }, []);
  return useCallback(
    (slug) => {
      if (SPECIAL_BRANCHES.includes(slug)) return t(`st.branch_${slug}`);
      if (slug === 'naval_mechanics') return t('st.branch_naval_mechanics');
      const c = cats.find((x) => x.slug === slug);
      return c ? categoryName(c) : categoryName({ slug, name_ar: slug });
    },
    [cats, t]
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="spec">
      <small>{label}</small>
      <b className="st-num">{value}</b>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

// Change vs. the previous period of the same length
function Trend({ now, prev }) {
  const { t } = useI18n();
  if (!prev && !now) return null;
  if (!prev) return <span className="pill ok">{t('st.new_activity')}</span>;
  const d = Math.round((100 * (now - prev)) / prev);
  return <span className={`pill ${d > 0 ? 'ok' : d < 0 ? 'bad' : ''}`}>{d > 0 ? '▲' : d < 0 ? '▼' : '='} {Math.abs(d)}%</span>;
}

// One-series bar chart (values per day). Tap or hover a bar to read its day and value.
function DayBars({ rows, field, label }) {
  const { t } = useI18n();
  const [sel, setSel] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r[field] || 0));
  const W = 300;
  const H = 90;
  const n = rows.length || 1;
  const slot = W / n;
  const bw = Math.max(2, slot - 2);
  const picked = sel != null ? rows[sel] : rows[rows.length - 1];
  return (
    <div className="box st-chart">
      <div className="st-chart-head">
        <b>{label}</b>
        {picked && <span className="muted small">{fmtDate(picked.day)} · <b>{fmtN(picked[field])}</b></span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 2}`} width="100%" role="img" aria-label={label} onMouseLeave={() => setSel(null)} style={{ direction: 'ltr' }}>
        <line x1="0" x2={W} y1={H + 1} y2={H + 1} stroke="var(--line)" strokeWidth="1" />
        {rows.map((r, i) => {
          const v = r[field] || 0;
          const h = v ? Math.max(3, (v / max) * (H - 4)) : 0;
          return (
            <g key={r.day} onMouseEnter={() => setSel(i)} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
              <rect x={i * slot} y="0" width={slot} height={H} fill="transparent" />
              {h > 0 && <rect x={i * slot + 1} y={H - h} width={bw} height={h + 1} rx={Math.min(4, bw / 2)} fill="var(--primary)" opacity={sel == null || sel === i ? 1 : 0.45} />}
              <title>{`${fmtDate(r.day)}: ${v}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="st-axis muted small" style={{ direction: 'ltr' }}><bdi>{rows[0] && fmtDate(rows[0].day)}</bdi><bdi>{t('st.today')}</bdi></div>
    </div>
  );
}

// Horizontal bars with the value and share written next to each (no colour-only meaning)
function HBars({ items, total }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="st-hbars">
      {items.map((x) => (
        <div key={x.key} className="st-hbar">
          <div className="st-hbar-label"><span>{x.label}</span><b>{fmtN(x.value)}{total ? <span className="muted small"> · {pctText(x.value, total)}</span> : null}</b></div>
          <div className="st-hbar-track"><div className="st-hbar-fill" style={{ width: `${(100 * x.value) / max}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function screenLabel(t, s) {
  return ['listing', 'pro_page', 'pro_quick', 'cold_offers', 'fisher_offers', 'fish_request'].includes(s) ? t(`st.screen_${s}`) : t('st.screen_other');
}

// ---------------------------------------------------------------------------------------------
function Overview({ data }) {
  const { t } = useI18n();
  const a = data.active;
  const u = data.users;
  const r = data.regularity;
  const regTotal = r.d1 + r.d2_3 + r.d4_7 + r.d8_14 + r.d15;
  const regular = r.d4_7 + r.d8_14 + r.d15;
  const stick = pct(Number(a.avg_dau_7d), a.users_30d);
  return (
    <>
      {data.tracking_since ? (
        <p className="muted small">{t('st.since', { date: fmtDate(data.tracking_since) })}</p>
      ) : (
        <p className="msg info">{t('st.no_data_yet')}</p>
      )}

      <div className="section-title">{t('st.active_title')}</div>
      <div className="specs">
        <Tile label={t('st.active_24h')} value={fmtN(a.users_24h)} sub={t('st.devices_n', { n: a.devices_24h })} />
        <Tile label={t('st.active_7d')} value={fmtN(a.users_7d)} sub={t('st.devices_n', { n: a.devices_7d })} />
        <Tile label={t('st.active_30d')} value={fmtN(a.users_30d)} sub={t('st.devices_n', { n: a.devices_30d })} />
        <Tile label={t('st.avg_dau')} value={fmtN(a.avg_dau_7d)} sub={t('st.opens_7d', { n: a.opens_7d })} />
        <Tile label={t('st.stickiness')} value={stick == null ? '—' : `${stick}%`} sub={t('st.stickiness_hint')} />
        <Tile label={t('st.users_total')} value={fmtN(u.total)} sub={t('st.new_users', { today: u.new_today, week: u.new_7d, month: u.new_30d })} />
      </div>
      <p className="muted small">{t('st.users_vs_devices')}</p>

      <DayBars rows={data.daily} field="devices" label={t('st.chart_active')} />
      <DayBars rows={data.daily} field="new_users" label={t('st.chart_new')} />

      <div className="section-title">{t('st.regular_title')}</div>
      <div className="box">
        <p className="small" style={{ marginTop: 0 }}>{t('st.regular_help')}</p>
        <HBars
          total={regTotal}
          items={[
            { key: 'd1', label: t('st.reg_d1'), value: r.d1 },
            { key: 'd2_3', label: t('st.reg_d2_3'), value: r.d2_3 },
            { key: 'd4_7', label: t('st.reg_d4_7'), value: r.d4_7 },
            { key: 'd8_14', label: t('st.reg_d8_14'), value: r.d8_14 },
            { key: 'd15', label: t('st.reg_d15'), value: r.d15 },
          ]}
        />
        <p className="small"><b>{t('st.regular_share', { pct: pctText(regular, regTotal) })}</b></p>
      </div>

      <div className="section-title">{t('st.retention_title')}</div>
      <div className="box">
        <p className="small" style={{ marginTop: 0 }}>{t('st.retention_help')}</p>
        {data.cohorts.length === 0 ? (
          <p className="muted small">{t('st.retention_none')}</p>
        ) : (
          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr><th>{t('st.week_of')}</th><th>{t('st.signups')}</th><th>{t('st.w1')}</th><th>{t('st.w2')}</th><th>{t('st.w4')}</th><th>{t('st.activated')}</th></tr>
              </thead>
              <tbody>
                {data.cohorts.map((c) => (
                  <tr key={c.week}>
                    <td>{fmtDate(c.week)}</td>
                    <td>{fmtN(c.size)}</td>
                    <td>{c.w1 == null ? '…' : pctText(c.w1, c.size)}</td>
                    <td>{c.w2 == null ? '…' : pctText(c.w2, c.size)}</td>
                    <td>{c.w4 == null ? '…' : pctText(c.w4, c.size)}</td>
                    <td>{pctText(c.activated, c.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">{t('st.retention_legend')}</p>
      </div>

      <div className="section-title">{t('st.health_title')}</div>
      <div className="specs">
        <Tile label={t('st.at_risk')} value={fmtN(a.at_risk)} sub={t('st.at_risk_hint')} />
        <Tile label={t('st.never_seen')} value={fmtN(u.never_seen)} sub={t('st.never_seen_hint')} />
      </div>
      {Object.keys(data.platforms || {}).length > 0 && (
        <div className="box">
          <b>{t('st.platforms')}</b>
          <HBars
            total={Object.values(data.platforms).reduce((s, v) => s + v, 0)}
            items={Object.entries(data.platforms).map(([k, v]) => ({ key: k, label: t(`st.pf_${k}`), value: v }))}
          />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
function Contacts({ data, days, onOpen }) {
  const { t } = useI18n();
  const branchLabel = useBranchLabel();
  const c = data.contacts;
  // hidden branches only appear when they have figures
  const rows = c.by_branch.filter((b) => !(HIDDEN_BRANCHES.includes(b.branch) && !b.total && !b.prev_total && !b.views));
  const screens = Object.entries(c.by_screen || {}).sort((a, b) => b[1] - a[1]);
  const kinds = Object.entries(c.by_listing_kind || {}).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <div className="specs">
        <Tile label={t('st.contacts_total')} value={fmtN(c.total)} sub={<Trend now={c.total} prev={c.prev_total} />} />
        <Tile label={t('st.contacts_users')} value={fmtN(c.users)} sub={t('st.contacts_users_hint')} />
        <Tile label={t('st.calls')} value={fmtN(c.calls)} sub={pctText(c.calls, c.total)} />
        <Tile label={t('st.whatsapp')} value={fmtN(c.whatsapp)} sub={pctText(c.whatsapp, c.total)} />
      </div>
      <p className="muted small">{t('st.contacts_reach', { pct: pctText(c.users, data.active[days <= 1 ? 'users_24h' : days <= 7 ? 'users_7d' : 'users_30d']) })}</p>

      <div className="section-title">{t('st.by_branch')}</div>
      <div className="st-table-wrap box" style={{ padding: 0 }}>
        <table className="st-table">
          <thead>
            <tr><th>{t('st.branch')}</th><th>{t('st.calls_short')}</th><th>{t('st.wa_short')}</th><th>{t('st.total')}</th><th>{t('st.people')}</th><th>{t('st.conversion')}</th><th>{t('st.trend')}</th></tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.branch} className="st-click" onClick={() => onOpen(b.branch)}>
                <td><button type="button" className="linkbtn">{branchLabel(b.branch)}</button></td>
                <td>{fmtN(b.calls)}</td>
                <td>{fmtN(b.whatsapp)}</td>
                <td><b>{fmtN(b.total)}</b></td>
                <td>{fmtN(b.users)}</td>
                <td>{b.user_views ? pctText(b.users, b.user_views) : '—'}</td>
                <td><Trend now={b.total} prev={b.prev_total} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">{t('st.branch_help')}</p>

      {kinds.length > 0 && (
        <div className="box">
          <b>{t('st.market_kinds')}</b>
          <HBars total={kinds.reduce((s, [, v]) => s + v, 0)} items={kinds.map(([k, v]) => ({ key: k, label: t(`kind.${k}`), value: v }))} />
        </div>
      )}
      {screens.length > 0 && (
        <div className="box">
          <b>{t('st.by_screen')}</b>
          <HBars total={c.total} items={screens.map(([k, v]) => ({ key: k, label: screenLabel(t, k), value: v }))} />
        </div>
      )}
      <DayBars rows={data.daily} field="contacts" label={t('st.chart_contacts')} />
    </>
  );
}

function itemLink(it) {
  if (it.type === 'listing') return `/listing/${it.id}`;
  if (it.type === 'pro') return `/pro/${it.id}`;
  if (it.type === 'fish_request') return `/fish/requests/${it.id}`;
  return null;
}

function BranchDetail({ branch, days, onBack }) {
  const { t } = useI18n();
  const branchLabel = useBranchLabel();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setD(null);
    setErr(null);
    supabase.rpc('admin_branch_stats', { p_branch: branch, p_days: days }).then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(isMissingSchema(error) ? t('st.needs_migration') : errorText(error));
      else setD(data);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, days]);

  const screens = d ? Object.entries(d.by_screen || {}).sort((a, b) => b[1] - a[1]) : [];
  const dailyTotal = useMemo(() => (d?.daily || []).map((x) => ({ ...x, total: x.calls + x.whatsapp })), [d]);

  return (
    <>
      <div className="admin-head" style={{ marginBottom: 8 }}>
        <button type="button" className="mini" onClick={onBack}>← {t('st.all_branches')}</button>
        <b style={{ fontSize: 17 }}>{branchLabel(branch)}</b>
      </div>
      {err && <p className="msg err">{err}</p>}
      {!d && !err && <p className="muted center">{t('common.loading')}</p>}
      {d && (
        <>
          <div className="specs">
            <Tile label={t('st.contacts_total')} value={fmtN(d.total)} sub={t('st.people_n', { n: d.users })} />
            <Tile label={t('st.calls')} value={fmtN(d.calls)} sub={t('st.whatsapp_n', { n: d.whatsapp })} />
            <Tile label={t('st.views')} value={fmtN(d.views)} sub={t('st.conversion_n', { pct: d.views ? pctText(d.users, d.views) : '—' })} />
          </div>

          <div className="section-title">{t('st.top_items')}</div>
          {d.items.length === 0 && <p className="empty">{t('st.no_contacts')}</p>}
          {d.items.map((it, i) => {
            const href = itemLink(it);
            const title = it.title || t('admin.deleted_item');
            return (
              <div key={`${it.type}:${it.id}`} className="box st-item">
                <div className="admin-head">
                  <span className="st-rank">{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>{href ? <Link to={href}>{title}</Link> : title}</b>
                    <div className="muted small">{[t(`st.type_${it.type}`), it.owner].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                <div className="muted small st-item-nums">
                  <span>📞 {fmtN(it.calls)}</span><span>💬 {fmtN(it.whatsapp)}</span>
                  <span>{t('st.people_n', { n: it.users })}</span><span>{t('st.views_n', { n: it.user_views })}</span>
                </div>
              </div>
            );
          })}

          {d.silent.length > 0 && (
            <>
              <div className="section-title">{t('st.silent_title', { n: d.silent.length })}</div>
              <p className="muted small">{t('st.silent_help')}</p>
              <div className="box">
                {d.silent.map((s) => (
                  <div key={s.id} className="st-silent">
                    <Link to={`/pro/${s.id}`}>{s.name}</Link>
                    <span className="muted small">{t('st.views_n', { n: s.views })}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {screens.length > 0 && (
            <div className="box">
              <b>{t('st.by_screen')}</b>
              <HBars total={d.total} items={screens.map(([k, v]) => ({ key: k, label: screenLabel(t, k), value: v }))} />
            </div>
          )}
          {days > 1 && <DayBars rows={dailyTotal} field="total" label={t('st.chart_contacts')} />}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
const USER_FILTERS = ['all', 'active7', 'inactive14', 'never'];

function UsersActivity() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);
  const [err, setErr] = useState(null);
  const seq = useRef(0);

  const fetchPage = useCallback(
    async (offset) => {
      const { data, error } = await supabase.rpc('admin_users_activity', { p_q: q.trim() || null, p_filter: filter, p_limit: USERS_PAGE, p_offset: offset });
      if (error) {
        setErr(isMissingSchema(error) ? t('st.needs_migration') : errorText(error));
        return null;
      }
      setErr(null);
      return data;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, filter]
  );

  useEffect(() => {
    const my = ++seq.current;
    const timer = setTimeout(async () => {
      const data = await fetchPage(0);
      if (my !== seq.current) return;
      setRows(data?.rows || []);
      setCount(data?.count || 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPage]);

  async function more() {
    const my = seq.current;
    const data = await fetchPage(rows.length);
    if (!data || my !== seq.current) return;
    setRows((prev) => [...prev, ...data.rows.filter((r) => !prev.some((p) => p.id === r.id))]);
  }

  return (
    <>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('st.users_search')} />
      <div className="st-chips">
        {USER_FILTERS.map((f) => (
          <button key={f} type="button" className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{t(`st.uf_${f}`)}</button>
        ))}
      </div>
      {err && <p className="msg err">{err}</p>}
      {rows === null && !err && <p className="muted center">{t('common.loading')}</p>}
      {rows && <p className="muted small">{t('st.users_count', { n: count })}</p>}
      {rows?.map((u) => (
        <div key={u.id} className="box st-user">
          <div className="admin-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{u.full_name || u.email || '—'}</b>
              <div className="muted small" dir="ltr" style={{ textAlign: 'start' }}>{[u.email, u.phone].filter(Boolean).join(' · ')}</div>
            </div>
            {u.last_seen_at ? (
              <span className={`pill ${Date.now() - new Date(u.last_seen_at).getTime() < 7 * 86400000 ? 'ok' : 'warn'}`}>{timeAgo(u.last_seen_at, t)}</span>
            ) : (
              <span className="pill bad">{t('st.not_seen')}</span>
            )}
          </div>
          <div className="muted small st-item-nums">
            <span>{t('st.days_30', { n: u.days_30 })}</span>
            <span>{t('st.contacts_30', { n: u.contacts_30 })}</span>
            {u.platform && <span>{t(`st.pf_${u.platform}`)}</span>}
            <span>{t('st.joined', { date: fmtDate(u.created_at) })}</span>
            {!u.last_seen_at && u.last_sign_in_at && <span>{t('st.last_login', { date: fmtDate(u.last_sign_in_at) })}</span>}
          </div>
        </div>
      ))}
      {rows && rows.length < count && <button className="btn alt" style={{ marginTop: 12 }} onClick={more}>{t('common.more')}</button>}
      {rows && rows.length === 0 && !err && <p className="empty">{t('admin.no_results')}</p>}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
export default function AdminStats() {
  const { t } = useI18n();
  const [view, setView] = useState('overview');
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [branch, setBranch] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    const { data: d, error } = await supabase.rpc('admin_app_stats', { p_days: days });
    if (error) return setErr(isMissingSchema(error) ? t('st.needs_migration') : errorText(error));
    setData(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // one request per period (switching views does not reload)
  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="seg seg3">
        {['overview', 'contacts', 'users'].map((v) => (
          <button key={v} type="button" className={`btn sm ${view === v ? '' : 'alt'}`} onClick={() => { setView(v); setBranch(null); }}>{t(`st.view_${v}`)}</button>
        ))}
      </div>

      {view === 'contacts' && (
        <div className="st-chips">
          <span className="muted small">{t('st.period')}</span>
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`chip ${days === p ? 'on' : ''}`} onClick={() => setDays(p)}>{p === 1 ? t('st.p_today') : t('st.p_days', { n: p })}</button>
          ))}
          <button type="button" className="chip" onClick={load} aria-label={t('st.refresh')}>↻</button>
        </div>
      )}

      {view === 'users' ? (
        <UsersActivity />
      ) : err ? (
        <p className="msg err">{err} <button className="linkbtn" onClick={load}>{t('common.retry')}</button></p>
      ) : !data ? (
        <p className="muted center">{t('common.loading')}</p>
      ) : view === 'overview' ? (
        <Overview data={data} />
      ) : branch ? (
        <BranchDetail branch={branch} days={days} onBack={() => setBranch(null)} />
      ) : (
        <Contacts data={data} days={days} onOpen={setBranch} />
      )}
    </>
  );
}
