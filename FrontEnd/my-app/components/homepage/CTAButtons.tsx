'use client';

import Link from 'next/link';

export default function CTAButtons() {
  return (
    <div
      className="flex flex-wrap justify-center gap-3"
      role="group"
      aria-label="Call to action"
    >
      <Link
        href="/quests"
        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_28px_rgba(34,211,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Explore all available quests"
      >
        Explore Quests
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 8h10M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <Link
        href="/dashboard"
        className="rounded-lg border border-slate-600 bg-transparent px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Connect your wallet"
      >
        Connect Wallet
      </Link>
    </div>
  );
}
