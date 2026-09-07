import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; tempToken?: string }>;
  verifyMfaLogin: (tempToken: string, code: string, isRecoveryCode?: boolean) => Promise<void>;
  register: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('securepass_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('securepass_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('securepass_user', JSON.stringify(res.user));
      }
    } catch {
      setUser(null);
      localStorage.removeItem('securepass_token');
      localStorage.removeItem('securepass_user');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('securepass_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('securepass_auth_expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.mfaRequired) {
      return { mfaRequired: true, tempToken: res.tempToken };
    }

    if (res.token && res.user) {
      localStorage.setItem('securepass_token', res.token);
      localStorage.setItem('securepass_user', JSON.stringify(res.user));
      setUser(res.user);
    }
    return { mfaRequired: false };
  };

  const verifyMfaLogin = async (tempToken: string, code: string, isRecoveryCode = false) => {
    const res = await api.verifyMfa({ tempToken, code, isRecoveryCode });
    if (res.token && res.user) {
      localStorage.setItem('securepass_token', res.token);
      localStorage.setItem('securepass_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const register = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    const res = await api.register({ fullName, email, password, confirmPassword });
    if (res.token && res.user) {
      localStorage.setItem('securepass_token', res.token);
      localStorage.setItem('securepass_user', JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('securepass_token');
    localStorage.removeItem('securepass_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyMfaLogin,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
