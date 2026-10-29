import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { ApiResponse, User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isVaultAdmin: boolean;
  isSystemAdmin: boolean;
  isRegularUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get<ApiResponse<User>>('/api/auth/me');
      if (res.data && res.data.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<User>>('/api/auth/login', { usernameOrEmail, password });
    const loggedInUser = res.data.data;
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await fetchCurrentUser();
  };

  const isVaultAdmin = user?.role === 'ROLE_VAULT_ADMIN';
  const isSystemAdmin = user?.role === 'ROLE_SYSTEM_ADMIN';
  const isRegularUser = user?.role === 'ROLE_USER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isVaultAdmin,
        isSystemAdmin,
        isRegularUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
