'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { AuthUserProfile } from '@/lib/types/api.types';
import * as authApi from '@/lib/api/auth';

interface AuthContextType {
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    stellarAddress: string,
    signature: string,
    challenge: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const profile = await authApi.getAuthProfile();
      setUser(profile);
      setError(null);
    } catch {
      // Profile fetch failed — user is not authenticated (no valid cookies)
      setUser(null);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (
    stellarAddress: string,
    signature: string,
    challenge: string
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      // Login sets httpOnly cookies via Set-Cookie headers.
      // The response body contains user info.
      await authApi.login({
        stellarAddress,
        signature,
        challenge,
        publicKey: stellarAddress,
      });
      // Fetch full profile to populate user state
      await refreshProfile();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
