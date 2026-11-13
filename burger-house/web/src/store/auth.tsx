import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { PanelState, Role, User } from '../lib/types';

type LoginResult = { user: User; redirect: string };

type AuthValue = {
  user: User | null;
  panel: PanelState | null;
  loading: boolean;
  login: (identifier: string, password: string, options?: { remember?: boolean; code?: string }) => Promise<LoginResult>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function redirectForRole(role: Role | string | undefined) {
  if (role === 'super_admin') return '/admin';
  if (role === 'manager') return '/manager';
  if (role === 'cashier') return '/cashier';
  return '/account';
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User | null; panel?: PanelState | null }>('/api/auth/me');
      setUser(data.user);
      setPanel(data.panel ?? null);
    } catch {
      setUser(null);
      setPanel(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (identifier: string, password: string, options: { remember?: boolean; code?: string } = {}) => {
      const data = await api<LoginResult & { requires2fa?: boolean }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, email: identifier, password, remember: options.remember, code: options.code },
      });
      if (data.requires2fa) {
        throw new Error('2FA_REQUIRED');
      }
      setUser(data.user);
      return { user: data.user, redirect: data.redirect || redirectForRole(data.user.role) };
    },
    []
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const data = await api<{ user: User }>('/api/auth/register', { method: 'POST', body: input });
      setUser(data.user);
      return data.user;
    },
    []
  );

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setPanel(null);
  }, []);

  const value = useMemo(
    () => ({ user, panel, loading, login, register, logout, refresh }),
    [user, panel, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
