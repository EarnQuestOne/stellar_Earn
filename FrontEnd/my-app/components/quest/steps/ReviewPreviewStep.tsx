'use client';

import type { QuestWizardData } from '@/lib/schemas/quest.schema';
import QuestPreview from '@/components/quest/QuestPreview';

interface ReviewPreviewStepProps {
  data: QuestWizardData;
  verifierAddress?: string | null;
}

const ReviewPreviewStep = ({
  data,
  verifierAddress,
}: ReviewPreviewStepProps) => {
  return (
    <section className="space-y-4" data-testid="step-preview">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        Preview mode is active. Review all values before publishing your quest.
      </div>
      <QuestPreview data={data} verifierAddress={verifierAddress} />
    </section>
  );
};

export default ReviewPreviewStep;
