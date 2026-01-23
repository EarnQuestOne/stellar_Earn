"use client";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import NotificationBell from "../notifications/NotificationBell";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-backdrop-filter:bg-zinc-900/60">
      <div className="flex h-16 items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/* Logo (mobile only) - Hidden on small screens to save space */}
        <div className="hidden items-center gap-2 sm:flex lg:hidden">
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
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            StellarEarn
          </span>
        </div>

        {/* Search - takes remaining space */}
        <div className="flex-1 sm:max-w-2xl">
          <GlobalSearch />
        </div>

        {/* User actions */}
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
