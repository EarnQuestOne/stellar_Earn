'use client';

import type { QuestWizardData } from '@/lib/schemas/quest.schema';

interface VerificationSettingsStepProps {
  data: QuestWizardData;
  errors: Record<string, string>;
  verifierAddress?: string | null;
  onConnectWallet: () => void;
  onChange: (next: QuestWizardData['verification']) => void;
}

const VerificationSettingsStep = ({
  data,
  errors,
  verifierAddress,
  onConnectWallet,
  onChange,
}: VerificationSettingsStepProps) => {
  const hasInstructionsError = Boolean(errors['verification.instructions']);
  const hasAutoCriteriaError = Boolean(errors['verification.autoCriteria']);
  const hasVerifierError = Boolean(errors['verification.verifierAddress']);

  return (
    <section className="space-y-5" data-testid="step-verification">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange({ ...data.verification, mode: 'manual' })}
          className={`rounded-2xl border p-4 text-left transition ${
            data.verification.mode === 'manual'
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
              : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900'
          }`}
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Manual Review
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Moderators approve submissions manually.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...data.verification, mode: 'auto' })}
          className={`rounded-2xl border p-4 text-left transition ${
            data.verification.mode === 'auto'
              ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
              : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900'
          }`}
        >
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Auto Verification
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Evaluate proof with objective criteria rules.
          </p>
        </button>
      </div>

      <label>
        <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Verification Instructions
        </span>
        <textarea
          rows={4}
          value={data.verification.instructions}
          onChange={(event) =>
            onChange({ ...data.verification, instructions: event.target.value })
          }
          placeholder="Explain how submissions are reviewed and what evidence is required."
          className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
            hasInstructionsError
              ? 'border-red-400 focus:border-red-500 dark:border-red-800'
              : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
          }`}
        />
        {errors['verification.instructions'] && (
          <p className="mt-1 text-xs text-red-600">
            {errors['verification.instructions']}
          </p>
        )}
      </label>

      {data.verification.mode === 'auto' && (
        <label>
          <span className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Automation Criteria
          </span>
          <textarea
            rows={3}
            value={data.verification.autoCriteria}
            onChange={(event) =>
              onChange({
                ...data.verification,
                autoCriteria: event.target.value,
              })
            }
            placeholder="Example: submission must include GitHub PR URL and all required labels"
            className={`w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm focus:outline-none dark:bg-zinc-800 ${
              hasAutoCriteriaError
                ? 'border-red-400 focus:border-red-500 dark:border-red-800'
                : 'border-zinc-300 focus:border-cyan-500 dark:border-zinc-700'
            }`}
          />
          {errors['verification.autoCriteria'] && (
            <p className="mt-1 text-xs text-red-600">
              {errors['verification.autoCriteria']}
            </p>
          )}
        </label>
      )}

      <div
        className={`rounded-2xl border p-4 ${
          hasVerifierError
            ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
            : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Verifier Address
            </p>
            <p className="mt-1 break-all text-xs text-zinc-500 dark:text-zinc-400">
              {verifierAddress ||
                'No verifier address detected yet. Connect a wallet or sign in to publish.'}
            </p>
          </div>
          {!verifierAddress && (
            <button
              type="button"
              onClick={onConnectWallet}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Connect Wallet
            </button>
          )}
        </div>
        {errors['verification.verifierAddress'] && (
          <p className="mt-2 text-xs text-red-600">
            {errors['verification.verifierAddress']}
          </p>
        )}
      </div>
    </section>
  );
};

export default VerificationSettingsStep;
