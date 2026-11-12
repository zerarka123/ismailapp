import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useI18n } from '../i18n/index.jsx';
import { boatTypeName, wilayaName } from '../i18n/names.js';
import { errorText } from '../errors';
import { daysLeft, fmtDate, fmtPrice, isMissingSchema } from '../lib/format';
import { cssUrl, publicUrl, removeFiles } from '../lib/images';
import { kindKey } from '../lib/safety';
import { isSponsored } from './ListingCard.jsx';

const PAGE = 30;
const KIND_FILTERS = ['boat', 'engine', 'equipment', 'fish', 'gear'];
const STATUS_FILTERS = ['published', 'hidden', 'sold', 'expired'];

// Value of the "section" select: boat:<typeId> | engine | equipment ('' = the listing is outside the open market)
const sectionOf = (l) => (l.kind === 'boat' ? `boat:${l.boat_type_id ?? ''}` : l.kind === 'engine' ? 'engine' : l.kind === 'equipment' && l.product_type !== 'fish' ? 'equipment' : '');

// Admin tab: every listing of the app (any status). Move it to another section / wilaya, change its place in the
// feed, hide it or delete it. All writes go through the admin_* functions of migration 013.
export default function AdminListings() {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [done, setDone] = useState(true);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [types, setTypes] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [moving, setMoving] = useState(null); // { id, section, wilayaId }
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    supabase.from('boat_types').select('*').order('sort_order').then(({ data }) => setTypes(data || []));
    supabase.from('wilayas').select('*').order('id').then(({ data }) => setWilayas(data || []));
  }, []);

  const typeById = useMemo(() => new Map(types.map((x) => [String(x.id), x])), [types]);
  const wilayaById = useMemo(() => new Map(wilayas.map((x) => [String(x.id), x])), [wilayas]);

  const fetchRows = useCallback(
    async (offset, limit = PAGE) => {
      const { data, error } = await supabase.rpc('admin_list_listings', {
        p_q: q.trim() || null,
        p_kind: kind || null,
        p_status: status || null,
        p_limit: limit,
        p_offset: offset,
      });
      if (error) {
        setMsg({ type: 'err', text: isMissingSchema(error) ? t('adl.needs_migration') : errorText(error) });
        return null;
      }
      return data || [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, kind, status]
  );

  // (re)load the first page whenever the search or a filter changes; the search waits until typing stops
  useEffect(() => {
    const my = ++seq.current;
    const timer = setTimeout(async () => {
      const data = await fetchRows(0);
      if (my !== seq.current) return;
      setRows(data || []);
      setDone(!data || data.length < PAGE);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRows]);

  async function more() {
    const data = await fetchRows(rows.length);
    if (!data) return;
    setRows((prev) => [...prev, ...data.filter((d) => !prev.some((p) => p.id === d.id))]);
    setDone(data.length < PAGE);
  }
  // reload what is on screen (after an action that changes the order)
  async function refresh() {
    const data = await fetchRows(0, Math.min(Math.max(rows?.length || PAGE, PAGE), 100));
    if (data) setRows(data);
  }

  async function call(l, name, args, okText) {
    setMsg(null);
    setBusyId(l.id);
    const res = await supabase.rpc(name, args);
    setBusyId(null);
    if (res.error) {
      setMsg({ type: 'err', text: isMissingSchema(res.error) ? t('adl.needs_migration') : errorText(res.error) });
      return null;
    }
    if (okText) setMsg({ type: 'ok', text: okText });
    return res;
  }

  async function toTop(l) {
    if (await call(l, 'admin_listing_to_top', { p_id: String(l.id) }, t('adl.moved_top'))) refresh();
  }
  // i = index of the listing that goes one step up (it exchanges its place with the one above it)
  async function swap(i) {
    const up = rows[i];
    const down = rows[i - 1];
    if (!up || !down) return;
    if (!(await call(up, 'admin_swap_listings', { p_above: String(up.id), p_below: String(down.id) }))) return;
    setRows((prev) => {
      const next = [...prev];
      const a = next.findIndex((x) => x.id === up.id);
      const b = next.findIndex((x) => x.id === down.id);
      if (a < 0 || b < 0) return prev;
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  }
  async function setHidden(l, hidden) {
    if (!(await call(l, 'admin_set_listing_hidden', { p_id: String(l.id), p_hidden: hidden }, t(hidden ? 'adl.hidden_ok' : 'adl.shown_ok')))) return;
    setRows((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: hidden ? 'hidden' : 'published' } : x)));
  }
  async function remove(l) {
    if (!window.confirm(t('adl.confirm_delete', { title: l.title }))) return;
    const res = await call(l, 'admin_delete_listing', { p_id: String(l.id) }, t('mine.deleted'));
    if (!res) return;
    setRows((prev) => prev.filter((x) => x.id !== l.id));
    // the rows are gone; now free the storage (a failure here only leaves orphan files)
    const files = res.data || {};
    try {
      if (files.images?.length) await removeFiles('listing-images', files.images);
      if (files.video) await removeFiles('portfolio-videos', [files.video]);
    } catch {
      /* ignore */
    }
  }
  async function saveMove(l) {
    if (!moving.section || moving.section === 'boat:') return setMsg({ type: 'err', text: t('adl.v_section') });
    const [k, typeId] = moving.section.split(':');
    const res = await call(
      l,
      'admin_move_listing',
      { p_id: String(l.id), p_kind: k, p_boat_type_id: k === 'boat' ? Number(typeId) : null, p_wilaya_id: moving.wilayaId ? Number(moving.wilayaId) : null },
      t('adl.moved')
    );
    if (!res) return;
    setRows((prev) =>
      prev.map((x) =>
        x.id === l.id
          ? { ...x, kind: k, boat_type_id: k === 'boat' ? Number(typeId) : null, wilaya_id: moving.wilayaId ? Number(moving.wilayaId) : x.wilaya_id, gear_type: null, product_type: null }
          : x
      )
    );
    setMoving(null);
  }

  function stateOf(l) {
    if (l.status === 'hidden') return [t('adl.st_hidden'), 'bad'];
    if (l.status === 'sold') return [t('mine.sold'), ''];
    if (l.status === 'removed') return [t('mine.removed'), 'bad'];
    return daysLeft(l.expires_at) > 0 ? [t('adl.st_published'), 'ok'] : [t('mine.expired'), 'warn'];
  }
  function sectionLabel(l) {
    if (l.kind === 'boat') {
      const bt = typeById.get(String(l.boat_type_id));
      return bt ? boatTypeName(bt) : t('kind.boat');
    }
    if (l.kind === 'equipment' && l.product_type === 'fish') return t('adl.kind_fish');
    return t(kindKey(l));
  }

  return (
    <>
      <p className="muted small">{t('adl.help')}</p>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adl.search')} />
      <div className="chips">
        <button className={`chip ${kind === '' ? 'on' : ''}`} onClick={() => setKind('')}>{t('common.all')}</button>
        {KIND_FILTERS.map((k) => (
          <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{t(`adl.kind_${k}`)}</button>
        ))}
      </div>
      <div className="chips" style={{ paddingTop: 6 }}>
        <button className={`chip ${status === '' ? 'on' : ''}`} onClick={() => setStatus('')}>{t('adl.st_all')}</button>
        {STATUS_FILTERS.map((s) => (
          <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{t(`adl.st_${s}`)}</button>
        ))}
      </div>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
      {rows === null && <p className="muted center">{t('common.loading')}</p>}
      {rows && rows.length === 0 && !msg && <p className="empty">{t('admin.no_results')}</p>}

      {rows?.map((l, i) => {
        const [label, tone] = stateOf(l);
        const busy = busyId === l.id;
        const w = wilayaById.get(String(l.wilaya_id));
        return (
          <div key={l.id} className="mine adl">
            <div className="mine-img" style={l.cover_path ? { backgroundImage: cssUrl(publicUrl('listing-images', l.cover_path)) } : undefined} />
            <div className="mine-info">
              <h4 dir="auto">{l.title}</h4>
              <div className="muted small">{fmtPrice(l.price_dzd)} · {sectionLabel(l)}{w ? ` · ${wilayaName(w)}` : ''}</div>
              <div className="muted small">{l.seller_name} · {fmtDate(l.published_at)}</div>
              <span className={`pill ${tone}`}>{label}</span>{' '}
              {isSponsored(l) && <span className="pill">⭐ {t('admin.sponsored_until', { date: fmtDate(l.sponsored_until) })}</span>}

              <div className="mine-actions">
                <button className="mini" disabled={busy || i === 0} onClick={() => swap(i)} aria-label={t('adl.up')} title={t('adl.up')}>▲</button>
                <button className="mini" disabled={busy || i === rows.length - 1} onClick={() => swap(i + 1)} aria-label={t('adl.down')} title={t('adl.down')}>▼</button>
                <button className="mini" disabled={busy} onClick={() => toTop(l)}>⤒ {t('adl.top')}</button>
                <button className="mini primary" disabled={busy} onClick={() => setMoving(moving?.id === l.id ? null : { id: l.id, section: sectionOf(l), wilayaId: l.wilaya_id != null ? String(l.wilaya_id) : '' })}>{t('adl.move')}</button>
              </div>
              <div className="mine-actions">
                <Link className="mini" to={`/listing/${l.id}`}>{t('mine.view')}</Link>
                {l.status === 'hidden' ? (
                  <button className="mini" disabled={busy} onClick={() => setHidden(l, false)}>{t('adl.show')}</button>
                ) : (
                  l.status === 'published' && <button className="mini" disabled={busy} onClick={() => setHidden(l, true)}>{t('adl.hide')}</button>
                )}
                <button className="mini danger" disabled={busy} onClick={() => remove(l)}>{t('common.delete')}</button>
              </div>

              {moving?.id === l.id && (
                <div className="edit-form">
                  <div className="field"><label>{t('adl.section')}</label>
                    <select className="input" value={moving.section} onChange={(e) => setMoving({ ...moving, section: e.target.value })}>
                      <option value="">{t('common.choose')}</option>
                      {types.map((x) => <option key={x.id} value={`boat:${x.id}`}>{t('kind.boat')} — {boatTypeName(x)}</option>)}
                      <option value="engine">{t('kind.engines')}</option>
                      <option value="equipment">{t('kind.equipment_plural')}</option>
                    </select>
                  </div>
                  <div className="field"><label>{t('field.wilaya')}</label>
                    <select className="input" value={moving.wilayaId} onChange={(e) => setMoving({ ...moving, wilayaId: e.target.value })}>
                      {wilayas.map((x) => <option key={x.id} value={x.id}>{wilayaName(x)}</option>)}
                    </select>
                  </div>
                  {sectionOf(l) === '' && <p className="muted small">{t('adl.move_note')}</p>}
                  <div className="row2">
                    <button className="btn sm" disabled={busy} onClick={() => saveMove(l)}>{busy ? t('common.wait') : t('adl.move_save')}</button>
                    <button type="button" className="btn alt sm" onClick={() => setMoving(null)}>{t('common.cancel')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {rows && !done && <button className="btn alt" style={{ marginTop: 12 }} onClick={more}>{t('common.more')}</button>}
    </>
  );
}
