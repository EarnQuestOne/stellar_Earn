"use client";
import { useWallet } from "../../context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Check, AlertCircle } from "lucide-react";
import React from "react";
import UserIcon from "./userIcon";

export function WalletModal() {
  const {
    isModalOpen,
    closeModal,
    supportedWallets,
    connect,
    isConnecting,
    error,
  } = useWallet();

  const [activeSelection, setActiveSelection] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (isModalOpen) setActiveSelection(null);
  }, [isModalOpen]);

  const handleConnectClick = async () => {
    if (activeSelection) {
      try {
        await connect(activeSelection);
      } catch (err) {
        console.error("Connection error:", err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
          role="button"
          tabIndex={-1}
          aria-label="Close wallet modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-96 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-300 bg-white p-5 shadow-2xl dark:border-[#2A3338] dark:bg-[#161E22] sm:w-96 sm:p-8"
          >
            <div className="flex flex-col items-center">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-medium text-zinc-900 dark:text-white">
                  Connect Wallet
                </h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-[#92A5A8]">
                  Connect your wallet to get started with SoroScope
                </p>
              </div>

              {error && (
                <div className="mb-4 flex w-full items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              )}

              <div className="mb-6 flex max-h-[44vh] w-full flex-col gap-3 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
                {supportedWallets.map((wallet) => {
                  const isSelected = activeSelection === wallet.id;
                  return (
                    <button
                      type="button"
                      key={wallet.id}
                      onClick={() => setActiveSelection(wallet.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#33C5E0]/30 bg-[#1a2333]/10 dark:bg-[#1a2333]"
                          : "border-zinc-300 bg-transparent hover:border-[#33C5E0]/20 hover:bg-zinc-100 dark:border-[#2A3338] dark:hover:bg-[#1a2333]"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                          isSelected
                            ? "border-[#33C5E0] bg-[#33C5E0]"
                            : "border-zinc-400 dark:border-[#2d3b4f]"
                        }`}
                      >
                        {isSelected && (
                          <Check
                            className="h-3 w-3 text-black"
                            strokeWidth={3}
                          />
                        )}
                      </div>

                      <div className="text-zinc-500 dark:text-[#92A5A8]">
                        <Wallet className="h-5 w-5" />
                      </div>

                      <span className="flex-1 text-left font-medium text-zinc-900 dark:text-white">
                        {wallet.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleConnectClick}
                disabled={!activeSelection || isConnecting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-all ${
                  activeSelection && !isConnecting
                    ? "bg-[#33C5E0] text-black hover:bg-[#33C5E0]/90"
                    : "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-[#2A3338] dark:text-gray-500"
                }`}
              >
                <UserIcon />
                <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
