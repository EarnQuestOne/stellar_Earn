'use client';

import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import RewardConfigurator from '@/components/quest/RewardConfigurator';

interface RewardConfigurationStepProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  onChange: (next: QuestWizardData['reward']) => void;
}

const RewardConfigurationStep = ({
  data,
  errors,
  onChange,
}: RewardConfigurationStepProps) => {
  return (
    <section className="space-y-4" data-testid="step-reward">
      <RewardConfigurator
        assetType={data.reward.assetType}
        amount={data.reward.amount}
        xpReward={data.reward.xpReward}
        errors={{
          amount: errors['reward.amount'],
          xpReward: errors['reward.xpReward'],
        }}
        onChange={onChange}
      />
      {errors['reward.amount'] && (
        <p className="text-xs text-red-600">{errors['reward.amount']}</p>
      )}
      {errors['reward.xpReward'] && (
        <p className="text-xs text-red-600">{errors['reward.xpReward']}</p>
      )}
    </section>
  );
};

export default RewardConfigurationStep;
