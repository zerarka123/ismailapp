import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { forgetPushToken, forgetWebPush } from './lib/push';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  // Account whose profile is loaded (or loading). Supabase re-sends SIGNED_IN / TOKEN_REFRESHED events many times
  // (every token refresh, every return to the tab): the profile is only fetched again when the account changes.
  const loadedFor = useRef(undefined);

  const loadProfile = useCallback(async (uid) => {
    loadedFor.current = uid || null;
    if (!uid) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    // network error: allow the next auth event to try again instead of keeping a missing profile
    if (error && loadedFor.current === uid) loadedFor.current = undefined;
    if (error) return setProfile((p) => (p?.id === uid ? p : null));
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      const uid = s?.user.id || null;
      if (uid === loadedFor.current && event !== 'USER_UPDATED') return;
      // do not call Supabase inside this callback directly (can deadlock)
      setTimeout(() => loadProfile(uid), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      recovery,
      clearRecovery: () => setRecovery(false),
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await forgetPushToken();
        await forgetWebPush();
        return supabase.auth.signOut();
      },
    }),
    [session, profile, loading, recovery, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
