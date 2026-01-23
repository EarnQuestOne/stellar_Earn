'use client';

import { useCallback } from 'react';
import { useSubmission, type SubmissionStep } from '@/lib/hooks/useSubmission';
import type { ProofType } from '@/lib/validation/submission';
import { FileUpload } from '@/components/ui/FileUpload';
import { ProofPreview } from '@/components/quest/ProofPreview';
import { SubmissionSuccessModal } from '@/components/ui/Modal';

interface SubmissionFormProps {
  questId: string;
  questTitle: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

const proofTypeOptions: { type: ProofType; label: string; description: string; icon: JSX.Element }[] = [
  {
    type: 'link',
    label: 'Link / URL',
    description: 'Submit a link to your work (GitHub, deployed site, etc.)',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    type: 'file',
    label: 'File Upload',
    description: 'Upload screenshots, documents, or other files',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: 'Text Description',
    description: 'Describe your work or provide detailed explanation',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
];

const stepTitles: Record<SubmissionStep, string> = {
  type: 'Select Proof Type',
  proof: 'Provide Your Proof',
  preview: 'Review & Submit',
  submitting: 'Submitting...',
  success: 'Submission Complete',
  error: 'Submission Error',
};

export function SubmissionForm({
  questId,
  questTitle,
  onClose,
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
    errors,
    getFieldError,
    isSubmitting,
    submitProgress,
    submit,
    submissionError,
    reset,
    isWalletConnected,
  } = useSubmission({
    questId,
    questTitle,
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const handleProofTypeSelect = useCallback(
    (type: ProofType) => {
      updateField('proofType', type);
      // Clear previous proof data when changing type
      updateField('link', '');
      updateField('text', '');
      updateField('file', null);
    },
    [updateField]
  );

  const handleSuccessClose = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = ['type', 'proof', 'preview'] as const;
    const currentIndex = steps.indexOf(currentStep as typeof steps[number]);

    return (
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                  ? 'bg-[#089ec3] text-white'
                  : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
              }`}
            >
              {index < currentIndex ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 transition-colors ${
                  index < currentIndex ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render proof type selection step
  const renderTypeStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        How would you like to prove you completed this quest?
      </p>
      <div className="space-y-3">
        {proofTypeOptions.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => handleProofTypeSelect(option.type)}
            className={`flex w-full items-start gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
              formData.proofType === option.type
                ? 'border-[#089ec3] bg-[#089ec3]/5'
                : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
            }`}
          >
            <div
              className={`rounded-lg p-2 ${
                formData.proofType === option.type
                  ? 'bg-[#089ec3] text-white'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {option.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{option.label}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{option.description}</p>
            </div>
            {formData.proofType === option.type && (
              <svg
                className="h-6 w-6 flex-shrink-0 text-[#089ec3]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
      {getFieldError('proofType') && (
        <p className="text-sm text-red-600 dark:text-red-400">{getFieldError('proofType')}</p>
      )}
    </div>
  );

  // Render proof input step
  const renderProofStep = () => (
    <div className="space-y-4">
      {formData.proofType === 'link' && (
        <div>
          <label
            htmlFor="proof-link"
            className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Proof URL
          </label>
          <input
            id="proof-link"
            type="url"
            value={formData.link || ''}
            onChange={(e) => updateField('link', e.target.value)}
            placeholder="https://github.com/username/repo"
            className={`w-full rounded-lg border px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 ${
              getFieldError('link')
                ? 'border-red-300 dark:border-red-800'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {getFieldError('link') && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getFieldError('link')}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Provide a link to your completed work (GitHub repo, deployed site, etc.)
          </p>
        </div>
      )}

      {formData.proofType === 'file' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Upload Proof
          </label>
          <FileUpload
            selectedFile={formData.file || null}
            onFileSelect={(file) => updateField('file', file)}
            error={getFieldError('file')}
          />
        </div>
      )}

      {formData.proofType === 'text' && (
        <div>
          <label
            htmlFor="proof-text"
            className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
          >
            Proof Description
          </label>
          <textarea
            id="proof-text"
            value={formData.text || ''}
            onChange={(e) => updateField('text', e.target.value)}
            placeholder="Describe your completed work in detail..."
            rows={6}
            className={`w-full rounded-lg border px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 ${
              getFieldError('text')
                ? 'border-red-300 dark:border-red-800'
                : 'border-zinc-300 dark:border-zinc-700'
            }`}
          />
          {getFieldError('text') && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{getFieldError('text')}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            {formData.text?.length || 0}/5000 characters (minimum 10)
          </p>
        </div>
      )}

      {/* Additional notes (optional) */}
      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <label
          htmlFor="additional-notes"
          className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-50"
        >
          Additional Notes (Optional)
        </label>
        <textarea
          id="additional-notes"
          value={formData.additionalNotes || ''}
          onChange={(e) => updateField('additionalNotes', e.target.value)}
          placeholder="Any additional context or notes for the reviewer..."
          rows={3}
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
        {getFieldError('additionalNotes') && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {getFieldError('additionalNotes')}
          </p>
        )}
      </div>
    </div>
  );

  // Render preview step
  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h4 className="mb-2 font-medium text-zinc-900 dark:text-zinc-50">Quest</h4>
        <p className="text-zinc-600 dark:text-zinc-400">{questTitle}</p>
      </div>

      <ProofPreview
        proofType={formData.proofType}
        link={formData.link}
        text={formData.text}
        file={formData.file}
        additionalNotes={formData.additionalNotes}
      />

      {!isWalletConnected && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Wallet not connected
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Please connect your wallet to submit your proof.
              </p>
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="mb-2 font-medium text-red-800 dark:text-red-200">
            Please fix the following errors:
          </p>
          <ul className="list-inside list-disc text-sm text-red-600 dark:text-red-300">
            {errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // Render submitting step
  const renderSubmittingStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-zinc-200 border-t-[#089ec3]" />
      <p className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        Submitting your proof...
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Please wait</p>
      <div className="mt-4 w-full max-w-xs">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full bg-[#089ec3] transition-all duration-300"
            style={{ width: `${submitProgress}%` }}
          />
        </div>
        <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {submitProgress}%
        </p>
      </div>
    </div>
  );

  // Render error step
  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <p className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">Submission Failed</p>
      <p className="mb-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {submissionError?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-[#089ec3] px-4 py-2 font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      >
        Try Again
      </button>
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return renderTypeStep();
      case 'proof':
        return renderProofStep();
      case 'preview':
        return renderPreviewStep();
      case 'submitting':
        return renderSubmittingStep();
      case 'error':
        return renderErrorStep();
      case 'success':
        return null; // Handled by modal
      default:
        return null;
    }
  };

  // Don't render form content during success (modal handles it)
  if (currentStep === 'success') {
    return (
      <SubmissionSuccessModal
        isOpen={true}
        onClose={handleSuccessClose}
        questTitle={questTitle}
      />
    );
  }

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submit Proof</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{questTitle}</p>
      </div>

      {/* Step indicator */}
      {!['submitting', 'error'].includes(currentStep) && renderStepIndicator()}

      {/* Step title */}
      <h3 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {stepTitles[currentStep]}
      </h3>

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      {!['submitting', 'error'].includes(currentStep) && (
        <div className="mt-6 flex gap-3">
          {canGoBack && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#089ec3] dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back
            </button>
          )}

          {currentStep === 'preview' ? (
            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting || !isWalletConnected}
              className="flex-1 rounded-lg bg-[#089ec3] px-4 py-2 font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              Submit Proof
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              disabled={!canGoNext}
              className="flex-1 rounded-lg bg-[#089ec3] px-4 py-2 font-medium text-white hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {/* Cancel button */}
      {onClose && !['submitting', 'success'].includes(currentStep) && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
