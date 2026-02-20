'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/ui/FileUpload';

interface SubmissionFormProps {
  questId: string;
  questTitle: string;
  isExpired?: boolean;
  isFull?: boolean;
  onSubmit?: (data: { questId: string; proof: File | null; notes: string }) => void;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function SubmissionForm({
  questId,
  questTitle,
  isExpired = false,
  isFull = false,
  onSubmit,
  onClose,
  onSuccess,
}: SubmissionFormProps) {
  const [proof, setProof] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const canStart = !isExpired && !isFull;

  const handleStartQuest = () => {
    setHasStarted(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proof) {
      return;
    }

    setIsSubmitting(true);

    // Simulate submission delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (onSubmit) {
      onSubmit({ questId, proof, notes });
    }

    setShowSuccess(true);
    setIsSubmitting(false);

    if (onSuccess) {
      onSuccess();
    }

    // Reset form after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setHasStarted(false);
      setProof(null);
      setNotes('');
    }, 3000);
  };

  if (showSuccess) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center dark:border-green-900 dark:bg-green-900/10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-green-900 dark:text-green-100">
          Interest Registered!
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          You've marked your interest in this quest. Submission functionality coming soon!
        </p>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Ready to Start?
        </h3>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Click the button below to indicate your interest in this quest. You'll be able to submit
          your work once you've completed the requirements.
        </p>

        {isExpired && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <p className="text-sm text-red-700 dark:text-red-300">
              This quest has expired and is no longer accepting new participants.
            </p>
          </div>
        )}

        {isFull && (
          <div className="mb-4 rounded-lg bg-orange-50 p-4 dark:bg-orange-900/10">
            <p className="text-sm text-orange-700 dark:text-orange-300">
              This quest has reached its maximum number of participants.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleStartQuest}
          disabled={!canStart}
          className="w-full rounded-lg bg-[#089ec3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
          aria-label={isExpired ? 'Quest expired, cannot start' : isFull ? 'Quest full, cannot start' : `Start quest: ${questTitle}`}
        >
          {isExpired ? 'Quest Expired' : isFull ? 'Quest Full' : 'Start Quest'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Submit Your Work
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quest Info */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/10">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Quest: {questTitle}
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Upload proof of your completed work and add any relevant notes
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Proof of Work <span className="text-red-500">*</span>
          </label>
          <FileUpload onFileSelect={setProof} selectedFile={proof} disabled={isSubmitting} />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Upload screenshots, documents, or other proof of your completed work
          </p>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#089ec3] focus:outline-none focus:ring-2 focus:ring-[#089ec3] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
            placeholder="Provide any additional context or notes about your submission..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setHasStarted(false);
              setProof(null);
              setNotes('');
              if (onClose) {
                onClose();
              }
            }}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
            aria-label="Cancel submission"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!proof || isSubmitting}
            className="flex-1 rounded-lg bg-[#089ec3] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0ab8d4] focus:outline-none focus:ring-2 focus:ring-[#089ec3] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            aria-label={!proof ? 'Please upload proof before submitting' : isSubmitting ? 'Submitting work' : `Submit work for quest: ${questTitle}`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Work'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
