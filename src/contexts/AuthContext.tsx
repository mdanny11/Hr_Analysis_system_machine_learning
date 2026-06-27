import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/services/api';
import { ApiError, getAccessToken } from '@/lib/apiClient';

export type UserRole = 'admin' | 'hr-manager' | 'hr-analyst' | 'department-head';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  lastLogin?: string;
  status?: 'active' | 'inactive' | 'suspended';
  mfaEnabled?: boolean;
}

const rolePermissions: Record<UserRole, string[]> = {
  admin: ['*'],
  'hr-manager': [
    'dashboard.view', 'employees.view', 'employees.edit', 'predictions.view', 'risk.view',
    'reports.view', 'reports.create', 'reports.export', 'decisions.view', 'decisions.create',
    'decisions.approve', 'engagement.view', 'engagement.create', 'alerts.view', 'alerts.configure',
    'benchmarks.view', 'audit.view', 'settings.view',
  ],
  'hr-analyst': [
    'dashboard.view', 'employees.view', 'predictions.view', 'predictions.run', 'predictions.train',
    'risk.view', 'data.preprocess', 'reports.view', 'reports.export', 'models.view', 'models.train',
    'models.evaluate', 'engagement.view', 'benchmarks.view', 'alerts.view', 'settings.view',
  ],
  'department-head': [
    'dashboard.view', 'employees.view.team', 'predictions.view.team', 'risk.view.team',
    'reports.view.team', 'alerts.view.team', 'decisions.feedback', 'engagement.view.team', 'settings.view',
  ],
};

export const routePermissions: Record<string, string> = {
  '/dashboard': 'dashboard.view',
  '/employees': 'employees.view',
  '/predictions': 'predictions.view',
  '/risk-analysis': 'risk.view',
  '/reports': 'reports.view',
  '/engagement': 'engagement.view',
  '/benchmarks': 'benchmarks.view',
  '/audit': 'audit.view',
  '/data-processing': 'data.preprocess',
  '/decisions': 'decisions.view',
  '/alerts': 'alerts.view',
  '/model-performance': 'models.view',
  '/user-management': 'users.manage',
  '/settings': 'settings.view',
  '/profile': 'settings.view',
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        setUser(me);
      } catch {
        await api.auth.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string, _role: UserRole) => {
    setIsLoading(true);
    try {
      const data = await api.auth.login(email, password);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Login failed. Please check your credentials and try again.';
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    const permissions = rolePermissions[user.role];
    if (permissions.includes('*')) return true;
    if (permissions.includes(permission)) return true;
    const teamVariant = permission + '.team';
    return permissions.includes(teamVariant);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
