import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LoginInput, SafeUser } from 'shared';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/api';

interface AuthContextValue {
  user: SafeUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<SafeUser>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...required: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Provides session state to the app, resolved once from `/api/auth/me` on load. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  const refreshCurrentUser = async () => { const result = await fetchCurrentUser(); setUser(result.user); setPermissions(result.permissions); };
  useEffect(() => { refreshCurrentUser().catch(() => { setUser(null); setPermissions([]); }).finally(() => setIsInitializing(false)); }, []);

  const login = async (input: LoginInput) => {
    const result = await loginRequest(input);
    setUser(result.user);
    setPermissions(result.permissions);
    return result.user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setPermissions([]);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, permissions, isAuthenticated: user !== null, isInitializing, login, logout, refreshCurrentUser, hasPermission: (permission) => permissions.includes(permission), hasAnyPermission: (...required) => required.some((permission) => permissions.includes(permission)) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Access the current session, login, and logout. Must be used within `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
