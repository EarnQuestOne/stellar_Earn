"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Key, Loader2, AlertCircle } from "lucide-react";

interface SignInChallengeProps {
  challenge: string;
  onSign: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  stellarAddress: string;
}

export function SignInChallenge({
  challenge,
  onSign,
  isLoading,
  error,
  stellarAddress,
}: SignInChallengeProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#33C5E0]/10 text-[#33C5E0]">
        <Shield className="h-8 w-8" />
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-white">
        Secure Sign-In
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-[#92A5A8]">
        To verify your identity, please sign this secure challenge with your
        wallet: <span className="font-mono text-[#33C5E0] line-break-anywhere">{stellarAddress.slice(0, 6)}...{stellarAddress.slice(-6)}</span>
      </p>

      <div className="mb-6 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left dark:border-[#2A3338] dark:bg-[#0F1621]">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-[#5D6B6E]">
          Message to Sign
        </p>
        <p className="font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">
          {challenge}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-left">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onSign}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#33C5E0] py-3 font-semibold text-black transition-all hover:bg-[#33C5E0]/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Key className="h-5 w-5" />
        )}
        <span>{isLoading ? "Signing..." : "Sign & Verify"}</span>
      </button>

      <p className="mt-4 text-[10px] text-zinc-400 dark:text-[#5D6B6E]">
        Signing this message doesn't cost any gas or affect your funds. It only
        proves you own this address.
      </p>
    </div>
  );
}
