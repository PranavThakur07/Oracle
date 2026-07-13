import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

interface User {
  id: number;
  email: string;
  name?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      if (authService.isAuthenticated()) {
        const profile = await authService.getMe();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.login(email, password);
      await fetchProfile();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      await authService.register(email, password, name);
      await fetchProfile();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const googleLogin = async (token: string) => {
    setLoading(true);
    try {
      await authService.googleLogin(token);
      await fetchProfile();
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
