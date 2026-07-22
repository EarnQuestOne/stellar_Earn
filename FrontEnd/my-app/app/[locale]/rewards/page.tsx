import { AppLayout } from '@/components/layout/AppLayout';
import { ClaimRewards } from '@/components/rewards/ClaimRewards';
import { RewardsList } from '@/components/rewards/RewardsList';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';

export default function RewardsPage() {
  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ComponentErrorBoundary componentName="ClaimRewards">
          <ClaimRewards />
        </ComponentErrorBoundary>
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <ComponentErrorBoundary componentName="RewardsList">
            <RewardsList />
          </ComponentErrorBoundary>
        </div>
      </div>
    </AppLayout>
  );
}
