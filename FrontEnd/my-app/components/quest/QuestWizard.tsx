'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Wallet } from 'lucide-react';
import DraftManager from '@/components/quest/DraftManager';
import QuestBasicsStep from '@/components/quest/steps/QuestBasicsStep';
import RequirementsCriteriaStep from '@/components/quest/steps/RequirementsCriteriaStep';
import RewardConfigurationStep from '@/components/quest/steps/RewardConfigurationStep';
import TimelineStep from '@/components/quest/steps/TimelineStep';
import VerificationSettingsStep from '@/components/quest/steps/VerificationSettingsStep';
import ReviewPreviewStep from '@/components/quest/steps/ReviewPreviewStep';
import ConfirmationStep from '@/components/quest/steps/ConfirmationStep';
import { useWallet } from '@/context/WalletContext';
import { useQuestCreation } from '@/lib/hooks/useQuestCreation';
import { useQuestDraft } from '@/lib/hooks/useQuestDraft';
import {
  defaultQuestWizardData,
  QUEST_WIZARD_STEPS,
  formatWizardDateTime,
  sanitizeWizardData,
  validateStep,
  zonedDateTimeToIso,
  type QuestWizardData,
  type QuestWizardStepIndex,
} from '@/lib/schemas/quest.schema';
import type { CreateQuestRequest } from '@/lib/types/api.types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toQuestCreatePayload(
  data: QuestWizardData,
  verifierAddress: string
): CreateQuestRequest {
  const deadline = data.timeline.deadline
    ? zonedDateTimeToIso(data.timeline.deadline, data.timeline.timezone)
    : null;

  const milestoneItems = data.timeline.milestones.filter(
    (item) => item.title.trim() && item.dueDate.trim()
  );

  const verificationSections = [
    `<section><h2>Quest Summary</h2><p>${escapeHtml(data.basics.shortDescription)}</p></section>`,
    `<section><h2>Verification Settings</h2><p><strong>Mode:</strong> ${escapeHtml(
      data.verification.mode === 'auto' ? 'Auto Verification' : 'Manual Review'
    )}</p><p>${escapeHtml(data.verification.instructions)}</p></section>`,
    data.verification.mode === 'auto' && data.verification.autoCriteria
      ? `<section><h3>Automation Criteria</h3><p>${escapeHtml(data.verification.autoCriteria)}</p></section>`
      : '',
    `<section><h2>Timeline</h2><p><strong>Deadline:</strong> ${escapeHtml(
      data.timeline.deadline
        ? `${formatWizardDateTime(data.timeline.deadline, data.timeline.timezone)} (${data.timeline.timezone})`
        : 'Not set'
    )}</p></section>`,
  ];

  if (milestoneItems.length > 0) {
    verificationSections.push(
      `<section><h3>Milestones</h3><ul>${milestoneItems
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.title)}</strong>: ${escapeHtml(
              `${formatWizardDateTime(item.dueDate, data.timeline.timezone)} (${data.timeline.timezone})`
            )}</li>`
        )
        .join('')}</ul></section>`
    );
  }

  return {
    title: data.basics.title,
    description: [data.basics.description, ...verificationSections]
      .filter(Boolean)
      .join(''),
    category: data.basics.category,
    difficulty: 'intermediate',
    rewardAsset: data.reward.assetType,
    rewardAmount: data.reward.amount,
    xpReward: data.reward.xpReward,
    verifierAddress,
    deadline: deadline ?? undefined,
    maxParticipants: 200,
    requirements: [
      ...data.requirements.skills.map((skill) => `Skill: ${skill}`),
      ...data.requirements.deliverables.map(
        (item) =>
          `Deliverable: ${item.title}${item.details ? ` (${item.details})` : ''}${item.required ? ' [required]' : ''}`
      ),
    ],
    tags: [
      'wizard-created',
      `asset-${data.reward.assetType.toLowerCase()}`,
      `verification-${data.verification.mode}`,
      `timezone-${data.timeline.timezone.toLowerCase().replaceAll('/', '-')}`,
    ],
  };
}

function parseErrors(errorList: Array<{ field: string; message: string }>) {
  return errorList.reduce<Record<string, string>>((acc, item) => {
    acc[item.field] = item.message;
    return acc;
  }, {});
}

const QuestWizard = () => {
  const router = useRouter();
  const { create, isCreating, verifierAddress } = useQuestCreation();
  const { openModal } = useWallet();

  const [wizardData, setWizardData] = useState(defaultQuestWizardData);
  const [stepIndex, setStepIndex] = useState<QuestWizardStepIndex>(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const getStepErrors = (
    currentStep: QuestWizardStepIndex,
    data: QuestWizardData
  ) => {
    const errors = [...validateStep(currentStep, data)];

    if ((currentStep === 4 || currentStep === 5) && !verifierAddress) {
      errors.push({
        field: 'verification.verifierAddress',
        message:
          'Connect a wallet or sign in so the quest can be assigned to a verifier address.',
      });
    }

    return errors;
  };

  const { saveDraft, loadDraft, clearDraft, draftMeta } = useQuestDraft(
    wizardData,
    stepIndex
  );

  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / QUEST_WIZARD_STEPS.length) * 100),
    [stepIndex]
  );

  const validateCurrent = () => {
    const errors = getStepErrors(stepIndex, wizardData);
    setFieldErrors(parseErrors(errors));
    return errors.length === 0;
  };

  useEffect(() => {
    setFieldErrors(parseErrors(getStepErrors(stepIndex, wizardData)));
  }, [stepIndex, verifierAddress, wizardData]);

  const applyStepUpdate = (
    updater: (prev: QuestWizardData) => QuestWizardData
  ) => {
    setWizardData((prev) => {
      const next = updater(prev);
      const nextErrors = getStepErrors(stepIndex, next);
      setFieldErrors(parseErrors(nextErrors));
      return next;
    });
  };

  const goNext = async () => {
    if (!validateCurrent()) {
      return;
    }

    if (stepIndex === 5) {
      if (!verifierAddress) {
        setFieldErrors(
          parseErrors([
            {
              field: 'verification.verifierAddress',
              message:
                'Connect a wallet or sign in so the quest can be assigned to a verifier address.',
            },
          ])
        );
        setStepIndex(4);
        return;
      }

      const payload = toQuestCreatePayload(
        sanitizeWizardData(wizardData),
        verifierAddress
      );
      const result = await create(payload);
      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to create quest.');
        setStepIndex(6);
        return;
      }

      setSubmitError(null);
      setSubmitted(true);
      clearDraft();
      setStepIndex(6);
      return;
    }

    if (stepIndex < 6) {
      setFieldErrors({});
      setStepIndex((prev) => Math.min(6, prev + 1) as QuestWizardStepIndex);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setFieldErrors({});
      setStepIndex((prev) => Math.max(0, prev - 1) as QuestWizardStepIndex);
    }
  };

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (!draft) {
      return;
    }

    setWizardData(draft.data);
    setStepIndex(draft.step);
    setFieldErrors({});
  };

  const currentStepContent = (() => {
    if (stepIndex === 0) {
      return (
        <QuestBasicsStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, basics: next }))
          }
        />
      );
    }
    if (stepIndex === 1) {
      return (
        <RequirementsCriteriaStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, requirements: next }))
          }
        />
      );
    }
    if (stepIndex === 2) {
      return (
        <RewardConfigurationStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, reward: next }))
          }
        />
      );
    }
    if (stepIndex === 3) {
      return (
        <TimelineStep
          data={wizardData}
          errors={fieldErrors}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, timeline: next }))
          }
        />
      );
    }
    if (stepIndex === 4) {
      return (
        <VerificationSettingsStep
          data={wizardData}
          errors={fieldErrors}
          verifierAddress={verifierAddress}
          onConnectWallet={openModal}
          onChange={(next) =>
            applyStepUpdate((prev) => ({ ...prev, verification: next }))
          }
        />
      );
    }
    if (stepIndex === 5) {
      return (
        <ReviewPreviewStep
          data={wizardData}
          verifierAddress={verifierAddress}
        />
      );
    }
    return (
      <ConfirmationStep
        submitted={submitted}
        questTitle={wizardData.basics.title}
        error={submitError}
      />
    );
  })();

  return (
    <section
      className="mx-auto w-full max-w-6xl py-4 sm:py-6"
      data-testid="quest-wizard"
      aria-label="Quest creation wizard"
    >
      <div className="mb-5 rounded-3xl border border-zinc-200 bg-linear-to-br from-cyan-50 via-white to-amber-50 p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:from-cyan-950/30 dark:via-zinc-900 dark:to-amber-950/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              Quest Creation Wizard
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Build a quest in seven guided steps
            </h1>
          </div>
          <DraftManager
            hasDraft={draftMeta.hasDraft}
            lastSavedAt={draftMeta.lastSavedAt}
            onSave={() => saveDraft(wizardData, stepIndex)}
            onLoad={handleLoadDraft}
            onClear={clearDraft}
          />
        </div>

        <div
          className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300"
          aria-live="polite"
          aria-atomic="true"
        >
          <span>
            Step {stepIndex + 1} of {QUEST_WIZARD_STEPS.length}:{' '}
            {QUEST_WIZARD_STEPS[stepIndex]}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quest creation progress: ${progress}% complete, step ${stepIndex + 1} of ${QUEST_WIZARD_STEPS.length}`}
          className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-cyan-500 to-amber-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <nav aria-label="Quest creation steps">
        <ol className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 list-none p-0 m-0">
          {QUEST_WIZARD_STEPS.map((stepLabel, index) => {
            const active = index === stepIndex;
            const completed = index < stepIndex;
            return (
              <li
                key={stepLabel}
                aria-current={active ? 'step' : undefined}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  active
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200'
                    : completed
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  {completed ? (
                    <>
                      <CheckCircle2
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Completed: </span>
                    </>
                  ) : (
                    <span aria-hidden="true">{index + 1}.</span>
                  )}
                  <span>{stepLabel}</span>
                  {active && <span className="sr-only"> (current step)</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <div
        className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900"
        role="region"
        aria-label={`Step ${stepIndex + 1}: ${QUEST_WIZARD_STEPS[stepIndex]}`}
        aria-live="polite"
      >
        {!verifierAddress && stepIndex >= 4 && stepIndex <= 5 && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <Wallet className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Verifier address required</p>
              <p className="mt-1">
                Connect a wallet or sign in before publishing so the backend can
                assign a verifier address to the quest.
              </p>
            </div>
          </div>
        )}
        {currentStepContent}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIndex === 0}
          aria-label={
            stepIndex === 0
              ? 'Back (unavailable on first step)'
              : `Go back to step ${stepIndex}: ${QUEST_WIZARD_STEPS[stepIndex - 1]}`
          }
          className="rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Back
        </button>

        <div className="flex flex-wrap gap-2">
          {stepIndex === 6 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setWizardData(defaultQuestWizardData);
                  setFieldErrors({});
                  setSubmitted(false);
                  setSubmitError(null);
                  setStepIndex(0);
                }}
                aria-label="Create another quest"
                className="rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Create Another
              </button>
              <button
                type="button"
                onClick={() => router.push('/quests')}
                aria-label="Go to quests listing page"
                className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
              >
                Go to Quests
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isCreating}
              aria-label={
                isCreating
                  ? 'Publishing quest, please wait'
                  : stepIndex === 5
                    ? 'Publish quest'
                    : `Continue to step ${stepIndex + 2}: ${QUEST_WIZARD_STEPS[stepIndex + 1]}`
              }
              aria-busy={isCreating}
              className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? 'Publishing...'
                : stepIndex === 5
                  ? 'Publish Quest'
                  : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default QuestWizard;
