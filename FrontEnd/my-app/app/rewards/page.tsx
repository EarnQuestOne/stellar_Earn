import { ClaimRewards } from '@/components/rewards/ClaimRewards';
import type { ClaimReward } from '@/lib/stellar/claim';

// Mock data - replace with actual data from your backend
const pendingRewards: ClaimReward[] = [
  { id: 'quest-1', amount: 100, asset: 'XLM', status: 'pending' },
  { id: 'quest-2', amount: 250, asset: 'XLM', status: 'pending' },
  { id: 'quest-3', amount: 75, asset: 'XLM', status: 'pending' },
];

const claimedRewards = [
  {
    id: 'claim-1',
    amount: 500,
    asset: 'XLM',
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    timestamp: new Date(Date.now() - 86400000),
    status: 'success' as const,
  },
];

export default function RewardsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Claim Your Rewards</h1>
          <p className="text-muted-foreground mt-2">
            View and claim your earned quest rewards securely
          </p>
        </div>

        <ClaimRewards 
          pendingRewards={pendingRewards}
          claimedRewards={claimedRewards}
        />
      </div>
    </main>
  );
}
