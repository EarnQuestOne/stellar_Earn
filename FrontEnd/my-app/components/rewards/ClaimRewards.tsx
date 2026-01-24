'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PendingRewards } from './PendingRewards';
import { ClaimButton } from './ClaimButton';
import { TransactionModal } from './TransactionModal';
import { RewardHistory } from './RewardHistory';
import { useClaim } from '@/lib/hooks/useClaim';
import type { ClaimReward } from '@/lib/stellar/claim';

interface ClaimRewardsProps {
  pendingRewards: ClaimReward[];
  claimedRewards?: Array<{
    id: string;
    amount: number;
    asset: string;
    transactionHash: string;
    timestamp: Date;
    status: 'success' | 'failed';
  }>;
}

export function ClaimRewards({
  pendingRewards,
  claimedRewards = [],
}: ClaimRewardsProps) {
  const [showModal, setShowModal] = useState(false);
  const { loading, error, transactionResult, claim, reset } = useClaim();

  const totalClaimable = pendingRewards.reduce((sum, r) => sum + r.amount, 0);

  const handleClaim = async () => {
    if (pendingRewards.length === 0) return;
    
    // Claim all pending rewards
    await claim('all', totalClaimable);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    reset();
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PendingRewards rewards={pendingRewards} />

      <ClaimButton
        amount={totalClaimable}
        loading={loading}
        disabled={pendingRewards.length === 0}
        onClick={handleClaim}
      />

      {claimedRewards.length > 0 && <RewardHistory history={claimedRewards} />}

      <TransactionModal
        open={showModal}
        result={transactionResult}
        onClose={handleModalClose}
      />
    </div>
  );
}
