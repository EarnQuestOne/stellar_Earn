'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { StatusTimeline } from './StatusTimeline';
import type { Submission } from '@/lib/types/submission';
import { FocusTrap } from '@/components/a11y/FocusTrap';
import { formatDate } from '@/lib/utils/date';
import { useQuestSocket } from '@/lib/hooks/useQuestSocket';

interface SubmissionDetailProps {
  submission: Submission | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SubmissionDetail({
  submission,
  isOpen,
  onClose,
}: SubmissionDetailProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [localSubmission, setLocalSubmission] = useState<Submission | null>(
    null
  );

  useEffect(() => {
    if (submission) {
      setLocalSubmission(submission);
    } else {
      setLocalSubmission(null);
    }
  }, [submission]);

  useQuestSocket({
    questId: localSubmission?.questId,
    onSubmissionUpdated: (event) => {
      if (event.submissionId === localSubmission?.id) {
        setLocalSubmission((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: event.status,
            rejectionReason: event.rejectionReason ?? prev.rejectionReason,
            updatedAt: new Date().toISOString(),
          };
        });
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current =
        document.activeElement as HTMLElement | null;

      // Focus the modal
      modalRef.current?.focus();
    } else {
      // Restore focus when modal closes
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !localSubmission) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // backdrop button covers the container; close when clicked
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 border-none p-0"
        onClick={handleBackdropClick}
        aria-label="Close submission details"
        tabIndex={-1}
      />
      <FocusTrap active={isOpen}>
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-detail-title"
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-900"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2
              id="submission-detail-title"
              className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Submission Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Close modal"
            >
              <svg
                className="h-6 w-6"
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
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Quest Information */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Quest
              </h3>
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {localSubmission.quest?.title}
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {localSubmission.quest?.description}
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Reward:
                    </span>
                    <span className="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {localSubmission.quest?.rewardAmount}{' '}
                      {localSubmission.quest?.rewardAsset}
                    </span>
                  </div>
                  {localSubmission.quest?.deadline && (
                    <div>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        Deadline:
                      </span>
                      <span className="ml-2 text-sm text-zinc-900 dark:text-zinc-50">
                        {formatDate(localSubmission.quest.deadline)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Status
              </h3>
              <StatusBadge status={localSubmission.status} />
            </div>

            {/* Timeline */}
            <StatusTimeline submission={localSubmission} />

            {/* Submission Details */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Submission Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Submitted:
                  </span>
                  <span className="ml-2 text-zinc-900 dark:text-zinc-50">
                    {formatDate(localSubmission.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Last Updated:
                  </span>
                  <span className="ml-2 text-zinc-900 dark:text-zinc-50">
                    {formatDate(localSubmission.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Proof */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                Proof
              </h3>
              <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-4 text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {JSON.stringify(localSubmission.proof, null, 2)}
              </pre>
            </div>

            {/* Rejection Reason */}
            {localSubmission.status === 'Rejected' && (
              <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-400 mb-1">
                  Rejection Reason
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300">
                  {localSubmission.rejectionReason ||
                    'No reason provided for rejection.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
              >
                Close
              </button>
              {localSubmission.status === 'Approved' && (
                <button
                  onClick={() => {
                    // TODO: Implement claim reward functionality
                    console.log(
                      'Claim reward for submission:',
                      localSubmission.id
                    );
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Claim Reward
                </button>
              )}
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
