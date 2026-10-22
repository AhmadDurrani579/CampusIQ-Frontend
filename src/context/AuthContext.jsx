import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import authApi from '../api/authApi';
import usersApi from '../api/usersApi';
import { setAccessToken, setUnauthorizedHandler } from '../api/axiosClient';
import { isMockMode } from '../api/mode';
import { clearMockSession, setMockUnauthorizedHandler } from '../mock/service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const operation = useRef(0);
  const logoutInFlight = useRef(null);
  const clearSession = useCallback(() => {
    if (isMockMode) clearMockSession();
    operation.current += 1;
    setAccessToken(null);
    setUser(null);
    setLoading(false);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    if (isMockMode) setMockUnauthorizedHandler(clearSession);
    return () => { setUnauthorizedHandler(null); if (isMockMode) setMockUnauthorizedHandler(null); };
  }, [clearSession]);

  const login = useCallback(async credentials => {
    clearSession();
    const current = operation.current;
    setLoading(true);
    try {
      const token = await authApi.login(credentials);
      if (current !== operation.current) throw new Error('Sign in was interrupted. Please try again.');
      setAccessToken(token.access_token);
      const canonicalUser = await usersApi.getMe();
      if (current !== operation.current) throw new Error('Sign in was interrupted. Please try again.');
      queryClient.clear();
      setUser(canonicalUser);
      return canonicalUser;
    } catch (error) {
      if (current === operation.current) clearSession();
      throw error;
    } finally { if (current === operation.current) setLoading(false); }
  }, [clearSession, queryClient]);

  const signup = useCallback(body => authApi.signup(body), []);
  const logout = useCallback(() => {
    if (logoutInFlight.current) return logoutInFlight.current;
    const current = operation.current;
    const request = authApi.logout().then(() => {
      if (current === operation.current) clearSession();
    }).finally(() => { if (logoutInFlight.current === request) logoutInFlight.current = null; });
    logoutInFlight.current = request;
    return request;
  }, [clearSession]);
  const updateProfile = useCallback(async body => {
    const current = operation.current;
    const updated = await usersApi.updateMe({ full_name: body.full_name });
    if (current !== operation.current) throw new Error('Your session changed. Sign in again before updating your profile.');
    setUser(updated);
    if (updated.role !== user?.role || (updated.id != null && user?.id != null && updated.id !== user.id)) queryClient.clear();
    else queryClient.invalidateQueries({ queryKey: ['profile'] });
    return updated;
  }, [queryClient, user]);

  return <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, signup, logout, updateProfile, isLoading }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
export default AuthProvider;
