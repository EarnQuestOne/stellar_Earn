"use client";

import Image from "next/image";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Header } from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <Header />
      <div className="flex flex-1 items-center justify-center">
        <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Welcome to Stellar Earn
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
           StellarEarn is a quest-based earning platform where teams define tasks ("quests"), contributors complete them, and rewards are distributed on-chain via Stellar smart contracts (Soroban). Users level up by completing quests, building an on-chain reputation trail and unlocking higher-value opportunities.
          </p>
        </div>
        {/* ConnectButton is now in the Header */}
      
        {/* Wallet Modal */}
        <WalletModal />
      </main>
      </div>
    </div>
  );
}
