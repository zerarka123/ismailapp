import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth.jsx';

const Ctx = createContext({ ids: new Set(), toggle: async () => false });
export const useFavorites = () => useContext(Ctx);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let alive = true;
    supabase
      .from('favorite_listings')
      .select('listing_id')
      .then(({ data }) => {
        if (alive) setIds(new Set((data || []).map((r) => r.listing_id)));
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // returns false when the visitor must sign in first
  const toggle = useCallback(
    async (id) => {
      if (!user) return false;
      const had = ids.has(id);
      const next = new Set(ids);
      if (had) next.delete(id);
      else next.add(id);
      setIds(next);
      const { error } = had
        ? await supabase.from('favorite_listings').delete().eq('listing_id', id).eq('user_id', user.id)
        : await supabase.from('favorite_listings').insert({ user_id: user.id, listing_id: id });
      if (error) setIds(ids);
      return true;
    },
    [user, ids]
  );

  const value = useMemo(() => ({ ids, toggle }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
