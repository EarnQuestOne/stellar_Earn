"use client";

import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Shield, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";

export function AuthStatusIndicator() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Authenticating...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        <ShieldAlert className="h-3 w-3 text-zinc-500" />
        Guest Mode
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#33C5E0]">
      <ShieldCheck className="h-3 w-3" />
      Verified: {user?.role}
    </div>
  );
}
