"use client";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <main className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
        <div className="flex flex-col gap-6 text-center sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to Stellar Earn
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            StellarEarn is a quest-based earning platform where teams define
            tasks (&quot;quests&quot;), contributors complete them, and rewards are
            distributed on-chain via Stellar smart contracts (Soroban). Users
            level up by completing quests, building an on-chain reputation
            trail and unlocking higher-value opportunities.
          </p>
        </div>
      </main>
    </div>
  );
}
