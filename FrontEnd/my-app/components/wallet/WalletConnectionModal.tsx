"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Check, AlertCircle, ArrowLeft, X } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { useAuth } from "../../context/AuthContext";
import { SignInChallenge } from "../auth/SignInChallenge";
import UserIcon from "./userIcon";
import * as authApi from "../../lib/api/auth";

export function WalletConnectionModal() {
  const {
    isModalOpen,
    closeModal,
    supportedWallets,
    connect,
    isConnecting,
    error: walletError,
    address,
    isConnected,
    signMessage,
  } = useWallet();

  const { login, isAuthenticated, error: authError } = useAuth();

  const [step, setStep] = useState<"select" | "sign">("select");
  const [activeSelection, setActiveSelection] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setStep("select");
      setActiveSelection(null);
      setChallenge(null);
      setIsSigning(false);
      setLocalError(null);
    }
  }, [isModalOpen]);

  // If wallet connects and we're not authenticated, move to sign step
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && step === "select" && !isConnecting) {
      handleGenerateChallenge(address);
    } else if (isConnected && isAuthenticated && isModalOpen) {
      closeModal();
    }
  }, [isConnected, address, isAuthenticated, step, isConnecting, isModalOpen]);

  const handleGenerateChallenge = async (addr: string) => {
    try {
      setLocalError(null);
      const response = await authApi.generateChallenge(addr);
      setChallenge(response.challenge);
      setStep("sign");
    } catch (err: any) {
      setLocalError(err?.message || "Failed to generate challenge");
    }
  };

  const handleConnectClick = async () => {
    if (activeSelection) {
      try {
        setLocalError(null);
        await connect(activeSelection);
      } catch (err) {
        // Error is handled by WalletContext
      }
    }
  };

  const handleSign = async () => {
    if (!challenge || !address) return;

    setIsSigning(true);
    setLocalError(null);
    try {
      const signature = await signMessage(challenge);
      await login(address, signature, challenge);
      closeModal();
    } catch (err: any) {
      setLocalError(err?.message || "Authentication failed");
    } finally {
      setIsSigning(false);
    }
  };

  const currentError = localError || walletError || authError;

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-50 w-[92vw] max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-[#2A3338] dark:bg-[#161E22] sm:p-8"
          >
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {step === "sign" && (
              <button
                onClick={() => setStep("select")}
                className="absolute left-4 top-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <div className="mt-2">
              {step === "select" ? (
                <div className="flex flex-col items-center">
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                      Connect Wallet
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500 dark:text-[#92A5A8]">
                      Choose your preferred wallet to continue
                    </p>
                  </div>

                  {currentError && (
                    <div className="mb-4 flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                      <span className="text-sm text-red-400">{currentError}</span>
                    </div>
                  )}

                  <div className="mb-6 flex w-full flex-col gap-2">
                    {supportedWallets.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => setActiveSelection(wallet.id)}
                        className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all ${
                          activeSelection === wallet.id
                            ? "border-[#33C5E0] bg-[#33C5E0]/5 dark:bg-[#33C5E0]/10"
                            : "border-zinc-200 bg-transparent hover:border-zinc-300 dark:border-[#2A3338] dark:hover:border-[#33C5E0]/30"
                        }`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          activeSelection === wallet.id ? "border-[#33C5E0] bg-[#33C5E0]" : "border-zinc-300 dark:border-[#2d3b4f]"
                        }`}>
                          {activeSelection === wallet.id && <Check className="h-3 w-3 text-black" strokeWidth={4} />}
                        </div>
                        <span className="flex-1 text-left font-medium text-zinc-900 dark:text-white">
                          {wallet.name}
                        </span>
                        <div className="text-zinc-400">
                          <Wallet className="h-5 w-5" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleConnectClick}
                    disabled={!activeSelection || isConnecting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#33C5E0] py-3 font-bold text-black transition-all hover:bg-[#33C5E0]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isConnecting ? "Connecting..." : "Connect"}
                    {!isConnecting && <UserIcon />}
                  </button>
                </div>
              ) : (
                <SignInChallenge
                  challenge={challenge || ""}
                  onSign={handleSign}
                  isLoading={isSigning}
                  error={localError}
                  stellarAddress={address || ""}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
