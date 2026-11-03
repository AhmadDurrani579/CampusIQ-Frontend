
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import { useQueryClient } from '@tanstack/react-query';

import authApi from '../api/authApi';
import usersApi from '../api/usersApi';

import {
  setAccessToken,
  setUnauthorizedHandler
} from '../api/axiosClient';

import { isMockMode } from '../api/mode';

import {
  clearMockSession,
  setMockUnauthorizedHandler
} from '../mock/service';

const AuthContext = createContext(null);

// ========================================
// Token storage
// ========================================
const TOKEN_KEY = 'campusiq_access_token';

function getStoredToken() {
  if (isMockMode) return null;

  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  if (isMockMode) return;

  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Browser storage may be unavailable.
  }
}

// ========================================
// Authentication Provider
// ========================================
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);

  const [isLoading, setLoading] = useState(
    () => !isMockMode && Boolean(getStoredToken())
  );

  const operation = useRef(0);
  const logoutInFlight = useRef(null);

  // ========================================
  // 1. Clear session
  // ========================================
  const clearSession = useCallback(() => {
    if (isMockMode) {
      clearMockSession();
    }

    operation.current += 1;

    storeToken(null);
    setAccessToken(null);
    setUser(null);
    setLoading(false);

    queryClient.clear();
  }, [queryClient]);

  // ========================================
  // 2. Restore session on browser refresh
  // ========================================
  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    if (isMockMode) {
      setMockUnauthorizedHandler(clearSession);
    }

    const token = getStoredToken();

    if (!isMockMode && token) {
      const current = operation.current;

      setAccessToken(token);
      setLoading(true);

      const restoreSession = async () => {
        try {
          const canonicalUser = await usersApi.getMe();

          if (current !== operation.current) {
            return;
          }

          setUser(canonicalUser);
        } catch (error) {
          console.error(
            'Session restoration failed:',
            error
          );

          if (current === operation.current) {
            clearSession();
          }
        } finally {
          if (current === operation.current) {
            setLoading(false);
          }
        }
      };

      restoreSession();
    }

    return () => {
      setUnauthorizedHandler(null);

      if (isMockMode) {
        setMockUnauthorizedHandler(null);
      }
    };
  }, [clearSession]);

  // ========================================
  // 3. Shared login session handler
  // Works for password and Google login
  // ========================================
  const authenticate = useCallback(
    async requestLogin => {
      clearSession();

      const current = operation.current;

      setLoading(true);

      try {
        const token = await requestLogin();

        if (current !== operation.current) {
          throw new Error(
            'Sign in was interrupted. Please try again.'
          );
        }

        if (
          !token ||
          typeof token.access_token !== 'string' ||
          !token.access_token.trim()
        ) {
          throw new Error(
            'The server did not return a valid access token.'
          );
        }

        // Save the CampusIQ JWT, not the Google ID token.
        setAccessToken(token.access_token);
        storeToken(token.access_token);

        // Obtain the authenticated account and role.
        const canonicalUser = await usersApi.getMe();

        if (current !== operation.current) {
          throw new Error(
            'Sign in was interrupted. Please try again.'
          );
        }

        queryClient.clear();

        setUser(canonicalUser);

        return canonicalUser;

      } catch (error) {
        if (current === operation.current) {
          clearSession();
        }

        throw error;
      } finally {
        if (current === operation.current) {
          setLoading(false);
        }
      }
    },
    [clearSession, queryClient]
  );

  // ========================================
  // 4. Normal email/password login
  // ========================================
  const login = useCallback(
    credentials =>
      authenticate(() => authApi.login(credentials)),
    [authenticate]
  );

  // ========================================
  // 5. Google Sign-In - NEW
  // POST /api/v1/auth/google
  // ========================================
  const loginWithGoogle = useCallback(
    idToken => {
      if (
        typeof idToken !== 'string' ||
        !idToken.trim()
      ) {
        return Promise.reject(
          new Error('Google ID token is required.')
        );
      }

      return authenticate(
        () => authApi.googleLogin(idToken)
      );
    },
    [authenticate]
  );

  // ========================================
  // 6. Signup
  // ========================================
  const signup = useCallback(
    body => authApi.signup(body),
    []
  );

  // ========================================
  // 7. Logout
  // ========================================
  const logout = useCallback(() => {
    if (logoutInFlight.current) {
      return logoutInFlight.current;
    }

    const current = operation.current;

    const request = authApi
      .logout()
      .then(() => {
        if (current === operation.current) {
          clearSession();
        }
      })
      .finally(() => {
        if (logoutInFlight.current === request) {
          logoutInFlight.current = null;
        }
      });

    logoutInFlight.current = request;

    return request;
  }, [clearSession]);

  // ========================================
  // 8. Update profile
  // ========================================
  const updateProfile = useCallback(
    async body => {
      const current = operation.current;

      const updated = await usersApi.updateMe({
        full_name: body.full_name
      });

      if (current !== operation.current) {
        throw new Error(
          'Your session changed. Sign in again before updating your profile.'
        );
      }

      setUser(updated);

      if (
        updated.role !== user?.role ||
        (
          updated.id != null &&
          user?.id != null &&
          updated.id !== user.id
        )
      ) {
        queryClient.clear();
      } else {
        queryClient.invalidateQueries({
          queryKey: ['profile']
        });
      }

      return updated;
    },
    [queryClient, user]
  );

  // ========================================
  // 9. Context provider
  // ========================================
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,

        login,
        loginWithGoogle,
        signup,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ========================================
// 10. Custom useAuth hook
// ========================================
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider.'
    );
  }

  return context;
}

export default AuthProvider;
