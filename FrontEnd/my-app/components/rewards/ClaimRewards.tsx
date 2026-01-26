'use client';

import { useState, useMemo } from 'react';
import { useClaim } from '@/lib/hooks/useClaim';
import { PendingRewards } from './PendingRewards';
import { ClaimButton } from './ClaimButton';
import { TransactionModal } from './TransactionModal';
import { RewardHistory } from './RewardHistory';
import { useRecentSubmissions } from '@/lib/hooks/useUserStats';
import { ClaimResult } from '@/lib/stellar/claim';

export function ClaimRewards() {
  const { submissions, isLoading: isSubmissionsLoading, refetch } = useRecentSubmissions();
  const { claim, status, result, error, reset } = useClaim();
  const [claimHistory, setClaimHistory] = useState<ClaimResult[]>([]);
  const [claimedIds, setClaimedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter approved but not yet claimed rewards
  // In a real app, 'approved' submissions would have a 'claimed' flag.
  // We'll simulate this by filtering for 'approved' status and removing them when claimed locally.
  const pendingRewards = useMemo(() => {
    return submissions.filter(s => s.status === 'approved' && !claimedIds.includes(s.id));
  }, [submissions, claimedIds]);

  const handleClaim = async () => {
    if (pendingRewards.length === 0) return;

    const totalAmount = pendingRewards.reduce((sum, r) => sum + r.reward, 0);
    setIsModalOpen(true);
    
    // We'll use a combined ID for "all" or just the first one for simulation
    const response = await claim('batch-claim', totalAmount);

    if (response?.success) {
      setClaimHistory(prev => [response, ...prev]);
      setClaimedIds(prev => [...prev, ...pendingRewards.map(r => r.id)]);
      refetch(); // Also trigger a background refetch
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (status === 'success') {
      reset();
    }
  };

  if (isSubmissionsLoading) {
    return (
      <div className="flex animate-pulse flex-col space-y-8">
        <div className="h-64 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Rewards
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Claim your earned rewards and track your transaction history on the Stellar network.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Pending and Claim Actions */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <PendingRewards rewards={pendingRewards} />
            
            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <ClaimButton 
                onClick={handleClaim} 
                status={status} 
                disabled={pendingRewards.length === 0}
              />
              <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
                Transactions are processed on the Stellar network and may take a few seconds.
              </p>
            </div>
          </div>

          {/* Reward History */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <RewardHistory claims={claimHistory} />
          </div>
        </div>

        {/* Right Column: Stats & Info Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-linear-to-br from-[#089ec3] to-[#056d86] p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Stellar Rewards</h3>
            <p className="text-sm opacity-90 mb-4">
              Your earned assets are distributed directly to your connected Stellar wallet upon claiming.
            </p>
            <div className="flex items-center gap-2 text-xs bg-white/10 rounded-lg p-3">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Verify all transactions on <strong>Stellar Expert</strong> or any block explorer.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Claiming Info</h4>
            <ul className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#089ec3] mt-1 shrink-0" />
                <span>Only approved quests are eligible for rewards.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#089ec3] mt-1 shrink-0" />
                <span>Gas fees are minimized thanks to the Stellar network.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#089ec3] mt-1 shrink-0" />
                <span>Rewards are typically processed within 3-5 seconds.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        status={status}
        result={result}
        error={error}
      />
    </div>
  );
}
