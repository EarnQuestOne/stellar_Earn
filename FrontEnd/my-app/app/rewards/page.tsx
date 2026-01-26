import { AppLayout } from '@/components/layout/AppLayout';
import { ClaimRewards } from '@/components/rewards/ClaimRewards';

export default function RewardsPage() {
  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <ClaimRewards />
      </div>
    </AppLayout>
  );
}
