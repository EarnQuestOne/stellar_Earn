"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * Hook for accessing authentication state and methods.
 * Wraps AuthContext to provide a clean interface.
 */
export const useAuthHook = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshProfile
  } = useAuth();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshProfile,
    // Helper to check if user has specific role
    hasRole: (role: string) => user?.role === role,
    isAdmin: user?.role === 'ADMIN',
  };
};

export default useAuthHook;
