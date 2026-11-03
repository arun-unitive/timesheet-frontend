import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import { qk } from '../api/queryKeys';

const AuthContext = createContext(null);

/**
 * Holds the authenticated session.
 *
 * The current user is served from the React Query cache (`/auth/me`), which
 * means: fetched exactly once per session, shared by every consumer, and never
 * re-requested by components that mount later.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStore.get());

  const { data: session, isLoading, isError } = useQuery({
    queryKey: qk.me,
    queryFn: async () => (await authApi.me()).data,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // A 401 from any request (expired token / deactivated account) ends the session.
  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear();
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);

  const login = useCallback(
    async (credentials) => {
      const { data: payload } = await authApi.login(credentials);
      tokenStore.set(payload.token);
      // Seed the cache so the shell renders instantly; the enabled query then
      // fills in the app settings in the background.
      queryClient.setQueryData(qk.me, payload);
      setToken(payload.token);
      return payload.user;
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      settings: session?.settings || { dailyTargetHours: 8, editWindowDays: 7, lockAfterApproval: true },
      isAuthenticated: Boolean(session?.user),
      isAdmin: session?.user?.role === 'admin',
      status: isLoading ? 'loading' : session?.user ? 'authenticated' : isError || !token ? 'unauthenticated' : 'loading',
      login,
      logout,
    }),
    [session, isLoading, isError, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
