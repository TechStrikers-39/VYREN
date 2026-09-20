import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/api/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<User>;
  register: (data: {
    email: string;
    password?: string;
    fullName?: string;
    role?: 'learner' | 'trainer' | 'admin';
    organization?: string;
    department?: string;
    designation?: string;
  }) => Promise<User>;
  googleLogin: () => Promise<void>;
  handleOAuthToken: (token: string) => Promise<User>;
  submitOnboarding: (data: {
    department?: string;
    designation?: string;
    responsibilities?: string;
    tools_experience?: string[];
    self_reported_level?: number;
    target_competencies?: string[];
  }) => Promise<User>;
  setUserProfile: (user: User) => void;
  resetDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password?: string;
    fullName?: string;
    role?: 'learner' | 'trainer' | 'admin';
    organization?: string;
    department?: string;
    designation?: string;
  }): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.register(data);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    const url = await authService.getGoogleAuthUrl();
    if (url) {
      window.location.href = url;
    }
  };

  const handleOAuthToken = async (token: string): Promise<User> => {
    setIsLoading(true);
    try {
      const u = await authService.getCurrentUser();
      setUser(u);
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const submitOnboarding = async (data: {
    department?: string;
    designation?: string;
    responsibilities?: string;
    tools_experience?: string[];
    self_reported_level?: number;
    target_competencies?: string[];
  }): Promise<User> => {
    const updated = await authService.submitOnboarding(data);
    setUser(updated);
    return updated;
  };

  const setUserProfile = (updated: User) => {
    setUser(updated);
  };

  const resetDemo = async () => {
    setIsLoading(true);
    try {
      await authService.resetDemoLearner();
      const fresh = await authService.getCurrentUser();
      setUser(fresh);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        googleLogin,
        handleOAuthToken,
        submitOnboarding,
        setUserProfile,
        resetDemo,
        logout,
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
