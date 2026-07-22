'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/ui/FileUpload';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSubmission } from '@/lib/hooks/useSubmission';
import type { SubmissionResponse } from '@/lib/types/api.types';
import type { ProofType } from '@/lib/validation/submission';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionFormProps {
  questId: string;
  questTitle: string;
  isExpired?: boolean;
  isFull?: boolean;
  onSuccess?: (response: SubmissionResponse) => void;
}

// ─── Commit-Reveal Tooltip ────────────────────────────────────────────────────

function CommitRevealInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="commit-reveal-explanation"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg
          className="h-3.5 w-3.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        How does proof submission work?
      </button>

      {open && (
        <div
          id="commit-reveal-explanation"
          role="region"
          aria-label="Commit-reveal scheme explanation"
          className="mt-2 rounded-lg bg-blue-50 p-4 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
        >
          <p className="mb-1 font-semibold">Commit-Reveal Scheme</p>
          <p>
            Stellar Earn uses a two-phase commit-reveal scheme to protect your
            proof from being copied before verification:
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>
              <strong>Commit:</strong> A cryptographic hash of your proof is
              recorded on-chain. No one can see the actual content yet.
            </li>
            <li>
              <strong>Reveal:</strong> Once committed, you reveal the full
              proof. The contract verifies it matches the original hash before
              awarding the reward.
            </li>
          </ol>
          <p className="mt-2 text-blue-600 dark:text-blue-300">
            File uploads are pinned to IPFS for permanent, decentralised storage
            before being committed on-chain.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROOF_TYPES: {
  value: ProofType;
  label: string;
  description: string;
}[] = [
  {
    value: 'link',
    label: 'URL',
    description:
      'Link to a GitHub repo, screenshot host, or any public resource',
  },
  {
    value: 'text',
    label: 'Text / Hash',
    description: 'IPFS CID, transaction ID, or a short written description',
  },
  {
    value: 'file',
    label: 'File Upload',
    description: 'Image, PDF, or document (max 10 MB) — pinned to IPFS',
  },
];

const INPUT_CLASS =
  'w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500';

const BTN_PRIMARY =
  'rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900';

const BTN_SECONDARY =
  'rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-zinc-800';

// ─── Main Component ───────────────────────────────────────────────────────────

export function SubmissionForm({
  questId,
  questTitle,
  isExpired = false,
  isFull = false,
  onSuccess,
}: SubmissionFormProps) {
  const {
    formData,
    updateField,
    currentStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoBack,
    getFieldError,
    isSubmitting,
    submitProgress,
    submit,
    submissionResponse,
    submissionError,
    reset,
  } = useSubmission({ questId, questTitle, onSuccess });

  // ── Quest not available ────────────────────────────────────────────────────
  if (isExpired || isFull) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {isExpired
            ? 'This quest has expired and is no longer accepting submissions.'
            : 'This quest has reached its maximum number of participants.'}
        </p>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (currentStep === 'success') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-900/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-green-900 dark:text-green-100">
          Proof Submitted!
        </h3>
        <p className="mb-4 text-sm text-green-700 dark:text-green-300">
          Your submission is pending review. You&apos;ll be notified once a
          verifier has reviewed your proof.
        </p>
        {submissionResponse && (
          <p className="mb-4 font-mono text-xs text-green-600 dark:text-green-400">
            Submission ID: {submissionResponse.id}
          </p>
        )}
        <button type="button" onClick={reset} className={BTN_SECONDARY}>
          Submit another proof
        </button>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (currentStep === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/10">
        <p className="mb-1 text-sm font-semibold text-red-800 dark:text-red-200">
          Submission Failed
        </p>
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">
          {submissionError?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Submitting ─────────────────────────────────────────────────────────────
  if (currentStep === 'submitting') {
    const uploadingFile = formData.proofType === 'file' && submitProgress < 80;
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center gap-3">
          <LoadingSpinner size="sm" label="Submitting proof" />
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {uploadingFile
              ? 'Uploading file to IPFS…'
              : 'Submitting proof on-chain…'}
          </p>
        </div>
        <ProgressBar value={submitProgress} label="Upload progress" showValue />
      </div>
    );
  }

  // ── Step: type ─────────────────────────────────────────────────────────────
  if (currentStep === 'type') {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Submit Proof
        </h3>
        <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
          Choose how you want to provide proof for{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-200">
            {questTitle}
          </span>
          .
        </p>

        <fieldset className="space-y-3">
          <legend className="sr-only">Select proof type</legend>
          {PROOF_TYPES.map(({ value, label, description }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                formData.proofType === value
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
              }`}
            >
              <input
                type="radio"
                name="proofType"
                value={value}
                checked={formData.proofType === value}
                onChange={() => updateField('proofType', value)}
                className="mt-0.5 accent-primary"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {label}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <CommitRevealInfo />

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!canGoNext}
            className={BTN_PRIMARY}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step: proof ────────────────────────────────────────────────────────────
  if (currentStep === 'proof') {
    const linkError = getFieldError('link');
    const textError = getFieldError('text');
    const fileError = getFieldError('file');
    const notesError = getFieldError('additionalNotes');

    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {formData.proofType === 'file'
            ? 'Upload Proof File'
            : formData.proofType === 'link'
              ? 'Enter Proof URL'
              : 'Enter Proof Text'}
        </h3>

        <div className="space-y-5">
          {formData.proofType === 'link' && (
            <div>
              <label
                htmlFor="proof-link"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Proof URL <span className="text-red-500">*</span>
              </label>
              <input
                id="proof-link"
                type="url"
                value={formData.link ?? ''}
                onChange={(e) => updateField('link', e.target.value)}
                placeholder="https://github.com/you/proof"
                className={INPUT_CLASS}
              />
              {linkError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {linkError}
                </p>
              )}
            </div>
          )}

          {formData.proofType === 'text' && (
            <div>
              <label
                htmlFor="proof-text"
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Proof Hash / Text <span className="text-red-500">*</span>
              </label>
              <textarea
                id="proof-text"
                rows={5}
                value={formData.text ?? ''}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Paste an IPFS CID (QmXxx...), transaction ID, or describe your proof..."
                className={INPUT_CLASS}
              />
              {textError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {textError}
                </p>
              )}
            </div>
          )}

          {formData.proofType === 'file' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Proof File <span className="text-red-500">*</span>
              </label>
              <FileUpload
                onFileSelect={(file) => updateField('file', file)}
                selectedFile={formData.file ?? null}
                error={fileError}
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Accepted: images, PDF, plain text, JSON, MP4/WebM · Max 10 MB ·
                Pinned to IPFS
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="additional-notes"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Additional Notes{' '}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="additional-notes"
              rows={3}
              value={formData.additionalNotes ?? ''}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              placeholder="Anything else the verifier should know..."
              className={INPUT_CLASS}
            />
            {notesError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {notesError}
              </p>
            )}
          </div>
        </div>

        <CommitRevealInfo />

        <div className="mt-6 flex justify-between">
          {canGoBack && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className={BTN_SECONDARY}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goToNextStep}
            disabled={!canGoNext}
            className={`${BTN_PRIMARY} ml-auto`}
          >
            Review
          </button>
        </div>
      </div>
    );
  }

  // ── Step: preview ──────────────────────────────────────────────────────────
  const proofTypeLabel =
    PROOF_TYPES.find((p) => p.value === formData.proofType)?.label ??
    formData.proofType;

  const proofPreview =
    formData.proofType === 'link'
      ? formData.link
      : formData.proofType === 'text'
        ? formData.text
        : formData.file?.name;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Review &amp; Submit
      </h3>

      <dl className="mb-5 divide-y divide-zinc-100 dark:divide-zinc-800">
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            Quest
          </dt>
          <dd className="text-right text-zinc-900 dark:text-zinc-100">
            {questTitle}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            Proof type
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{proofTypeLabel}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="font-medium text-zinc-600 dark:text-zinc-400">
            Proof
          </dt>
          <dd className="max-w-[60%] break-all text-right text-zinc-900 dark:text-zinc-100">
            {proofPreview ?? '—'}
          </dd>
        </div>
        {formData.additionalNotes && (
          <div className="flex justify-between gap-4 py-3 text-sm">
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Notes
            </dt>
            <dd className="max-w-[60%] text-right text-zinc-600 dark:text-zinc-400">
              {formData.additionalNotes}
            </dd>
          </div>
        )}
      </dl>

      <p className="mb-5 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        Once submitted, your proof will be committed on-chain and sent to a
        verifier for review. This action cannot be undone.
      </p>

      <div className="flex gap-3">
        {canGoBack && (
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={isSubmitting}
            className={BTN_SECONDARY}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className={`${BTN_PRIMARY} flex-1`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" variant="white" label="Submitting" />
              Submitting&hellip;
            </span>
          ) : (
            'Submit Proof'
          )}
        </button>
      </div>
    </div>
  );
}
