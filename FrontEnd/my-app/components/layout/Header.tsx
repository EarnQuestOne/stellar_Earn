"use client";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import NotificationBell from "../notifications/NotificationBell";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { WalletModal } from "@/components/wallet/WalletModal";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-backdrop-filter:bg-zinc-900/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        {/* Logo - Stellar Earn */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: "#089ec3" }}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Stellar Earn
          </span>
        </div>

        {/* Search - takes remaining space */}
        <div className="flex-1 sm:max-w-2xl">
          <GlobalSearch />
        </div>

        {/* User actions */}
        <div className="flex shrink-0 items-center gap-3">
          <NotificationBell />
        </div>

        <ConnectButton />

        {/* Wallet Modal */}
        <WalletModal />
      </div>
    </header>
  );
}
