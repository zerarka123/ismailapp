import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { PAGE_SIZE } from '../config';
import { likeEscape } from './format';

export const LISTING_SELECT =
  'id, title, price_dzd, length_m, year_built, condition, engine_info, kind, published_at, bumped_at, expires_at, status, seller_id, seller_name, profiles!listings_seller_id_fkey(user_type, is_verified), wilayas(name_ar), boat_types!left(name_ar), listing_images(storage_path, sort_order)';

// Paged list of visible listings.
// filters: { q, typeId, kind, wilayaId, minPrice, maxPrice, ids, sellerId, excludeKind }
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
      if (f.ids && f.ids.length === 0) {
        setItems([]);
        setDone(true);
        setLoading(false);
        return;
      }
      let q = supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('status', 'published')
        .gt('expires_at', new Date().toISOString())
        .order('bumped_at', { ascending: false })
        .range(page.current * PAGE_SIZE, page.current * PAGE_SIZE + PAGE_SIZE - 1);

      if (f.q) q = q.ilike('title', `%${likeEscape(f.q)}%`);
      if (f.kind) q = q.eq('kind', f.kind);
      if (f.excludeKind) q = q.neq('kind', f.excludeKind);
      if (f.typeId) q = q.eq('boat_type_id', f.typeId);
      if (f.wilayaId) q = q.eq('wilaya_id', f.wilayaId);
      if (f.minPrice) q = q.gte('price_dzd', f.minPrice);
      if (f.maxPrice) q = q.lte('price_dzd', f.maxPrice);
      if (f.ids) q = q.in('id', f.ids);
      if (f.sellerId) q = q.eq('seller_id', f.sellerId);

      const { data, error: err } = await q;
      if (err) {
        console.error('Supabase fetch error:', err);
        setError(true);
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
