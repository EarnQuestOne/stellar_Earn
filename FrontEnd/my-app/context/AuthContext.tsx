"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUserProfile, AuthTokens } from "@/lib/types/api.types";
import * as authApi from "@/lib/api/auth";
import { tokenManager } from "@/lib/api/client";

interface AuthContextType {
  user: AuthUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (stellarAddress: string, signature: string, challenge: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!tokenManager.getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const profile = await authApi.getAuthProfile();
      setUser(profile);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch auth profile:", err);
      // If profile fetch fails with 401, tokenManager might have cleared tokens
      if (!tokenManager.getAccessToken()) {
        setUser(null);
      }
      setError(err?.message || "Failed to load user profile");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (stellarAddress: string, signature: string, challenge: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.login({
        stellarAddress,
        signature,
        challenge,
        publicKey: stellarAddress, // In this context, publicKey is the same as stellarAddress
      });
      await refreshProfile();
    } catch (err: any) {
      setError(err?.message || "Login failed");
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
      console.error("Logout error:", err);
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
