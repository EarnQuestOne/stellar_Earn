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
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#33C5E0]/10 text-[#33C5E0] shadow-inner shadow-[#33C5E0]/5"
      >
        <Shield className="h-10 w-10" />
      </motion.div>

      <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Verify Ownership
      </h2>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-[#92A5A8]">
        To finalize your secure sign-in, please sign this unique challenge with your wallet:
        <br />
        <span className="mt-1 inline-block font-mono text-xs font-bold text-[#33C5E0] bg-[#33C5E0]/5 px-2 py-0.5 rounded-md">
          {stellarAddress.slice(0, 6)}...{stellarAddress.slice(-6)}
        </span>
      </p>

      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 text-left dark:border-[#2A3338] dark:bg-[#0F1621]/50"
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-[#5D6B6E]">
          Authentication Message
        </p>
        <p className="font-mono text-xs leading-relaxed break-all text-zinc-600 dark:text-zinc-400">
          {challenge}
        </p>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <span className="text-xs leading-tight text-red-500/90">{error}</span>
        </motion.div>
      )}

      <button
        type="button"
        onClick={onSign}
        disabled={isLoading}
        className="group relative w-full overflow-hidden rounded-2xl bg-[#33C5E0] py-4 font-bold text-black transition-all hover:bg-[#33C5E0]/90 hover:shadow-[0_0_20px_rgba(51,197,224,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="relative z-10 flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <Key className="h-5 w-5" />
              <span>Sign & Verify</span>
            </>
          )}
        </div>
      </button>

      <p className="mt-6 text-[10px] leading-relaxed text-zinc-400 dark:text-[#5D6B6E]">
        Signing is a secure, off-chain action that proves your identity. 
        <br />
        It does not involve any transaction or fees.
      </p>
    </div>
  );
}
