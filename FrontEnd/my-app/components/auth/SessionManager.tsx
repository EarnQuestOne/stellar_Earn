'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

/**
 * SessionManager handles:
 * 1. Auto-refreshing tokens before they expire (via /auth/profile calls)
 * 2. Monitoring authentication status
 * 3. Showing session timeout warnings
 */
export function SessionManager() {
  const { isAuthenticated, refreshProfile, logout, user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const warningTimeout = useRef<NodeJS.Timeout | null>(null);

  // Constants for session management
  // Access token is 15 minutes, refresh before that
  const REFRESH_BEFORE_EXPIRY = 60 * 1000; // 1 minute before access token expiry
  const DEFAULT_ACCESS_TOKEN_LIFETIME = 15 * 60 * 1000; // 15 minutes

  useEffect(() => {
    const setupTimers = () => {
      if (!isAuthenticated) return;

      // Clear existing timers
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (warningTimeout.current) clearTimeout(warningTimeout.current);

      const lifetime = DEFAULT_ACCESS_TOKEN_LIFETIME;
      const refreshTime = Math.max(lifetime - REFRESH_BEFORE_EXPIRY, 30000);

      refreshInterval.current = setInterval(async () => {
        setIsRefreshing(true);
        try {
          await refreshProfile();
        } catch (error) {
          console.error('Proactive session refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      }, refreshTime);
    };

    setupTimers();

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (warningTimeout.current) clearTimeout(warningTimeout.current);
    };
  }, [isAuthenticated, refreshProfile]);

  return (
    <>
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium shadow-lg dark:border-[#2A3338] dark:bg-[#161E22]"
          >
            <RefreshCw className="h-3 w-3 animate-spin text-[#33C5E0]" />
            <span className="text-zinc-500 dark:text-[#92A5A8]">
              Refreshing session...
            </span>
          </motion.div>
        )}

        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="w-[90vw] max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-[#2A3338] dark:bg-[#161E22]">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-zinc-900 dark:text-white">
                Session Expiring
              </h3>
              <p className="mb-6 text-sm text-zinc-500 dark:text-[#92A5A8]">
                Your session is about to expire. Would you like to stay logged
                in?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={logout}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-[#2A3338] dark:hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
                <button
                  onClick={() => {
                    refreshProfile();
                    setShowWarning(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#33C5E0] py-2 text-sm font-bold text-black hover:bg-[#33C5E0]/90"
                >
                  Stay Logged In
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
