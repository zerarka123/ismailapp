import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { PAGE_SIZE } from '../config';
import { isMissingSchema, likeEscape } from './format';

const BASE =
  'id, title, price_dzd, length_m, year_built, condition, engine_info, kind, profession, published_at, bumped_at, expires_at, status, seller_id, seller_name, wilayas(*), boat_types!left(*), listing_images(storage_path, sort_order)';
// gear_type / sponsored_until come with migration 003; the BASE select keeps older databases working
export const LISTING_SELECT = `${BASE}, gear_type, sponsored_until`;
export const LISTING_SELECT_BASE = BASE;

// Runs build(select) and, if the database has not been migrated yet, retries with the older column list.
export async function selectListings(build) {
  const res = await build(LISTING_SELECT);
  if (res.error && isMissingSchema(res.error)) return build(LISTING_SELECT_BASE);
  return res;
}

// Paged list of visible listings.
// filters: { q, typeId, kind, kinds, wilayaId, minPrice, maxPrice, ids, sellerId, sellerIds, excludeKind, sponsored }
export function useListings(filters) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const page = useRef(0);
  const key = JSON.stringify(filters);

  const load = useCallback(
    async (reset) => {
      if (reset) page.current = 0;
      setLoading(true);
      setError(false);
      const f = JSON.parse(key);
      if ((f.ids && f.ids.length === 0) || (f.sellerIds && f.sellerIds.length === 0)) {
        setItems([]);
        setDone(true);
        setLoading(false);
        return;
      }
      const from = page.current * PAGE_SIZE;
      const build = (select) => {
        let q = supabase
          .from('listings')
          .select(select)
          .eq('status', 'published')
          .gt('expires_at', new Date().toISOString())
          .order('bumped_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (f.q) q = q.ilike('title', `%${likeEscape(f.q)}%`);
        if (f.kind) q = q.eq('kind', f.kind);
        if (f.kinds) q = q.in('kind', f.kinds);
        if (f.excludeKind) q = q.neq('kind', f.excludeKind);
        if (f.typeId) q = q.eq('boat_type_id', f.typeId);
        if (f.wilayaId) q = q.eq('wilaya_id', f.wilayaId);
        if (f.minPrice) q = q.gte('price_dzd', f.minPrice);
        if (f.maxPrice) q = q.lte('price_dzd', f.maxPrice);
        if (f.ids) q = q.in('id', f.ids);
        if (f.sellerId) q = q.eq('seller_id', f.sellerId);
        if (f.sellerIds) q = q.in('seller_id', f.sellerIds);
        if (f.sponsored) q = q.gt('sponsored_until', new Date().toISOString());
        return q;
      };

      const { data, error: err } = f.sponsored ? await build(LISTING_SELECT) : await selectListings(build);
      if (err) {
        // Sponsored strip on a database without migration 003: just show nothing
        if (f.sponsored && isMissingSchema(err)) {
          setItems([]);
          setDone(true);
          setLoading(false);
          return;
        }
        console.error('Supabase fetch error:', err);
        setError(`${err.code || ''} ${err.message || ''}`.trim() || true);
        setLoading(false);
        return;
      }
      setItems((prev) => (reset ? data : [...prev, ...data]));
      setDone(data.length < PAGE_SIZE);
      page.current += 1;
      setLoading(false);
    },
    [key]
  );

  useEffect(() => {
    load(true);
  }, [load]);

  return { items, loading, error, done, more: () => load(false), reload: () => load(true) };
}
