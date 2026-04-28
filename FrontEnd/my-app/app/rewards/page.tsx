import { AppLayout } from '@/components/layout/AppLayout';
import { ClaimRewards } from '@/components/rewards/ClaimRewards';
import { ComponentErrorBoundary } from '@/components/error/ErrorBoundary';

export default function RewardsPage() {
  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ComponentErrorBoundary componentName="ClaimRewards">
          <ClaimRewards />
        </ComponentErrorBoundary>
      </div>
    </AppLayout>
  );
}
