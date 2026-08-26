'use client';

import { SubmissionStatus } from '@/lib/types/submission';
import type { Submission } from '@/lib/types/submission';
import { formatTimelineDate } from '@/lib/utils/date';

interface StatusTimelineProps {
  submission: Submission;
}

/**
 * Fix #2215: defines the canonical step order explicitly so the timeline
 * always renders CREATED → PENDING → UNDER_REVIEW → APPROVED/REJECTED → PAID
 * regardless of insertion order or status transitions.
 */
const STEP_ORDER: Array<SubmissionStatus | 'CREATED'> = [
  'CREATED',
  SubmissionStatus.PENDING,
  SubmissionStatus.UNDER_REVIEW,
  SubmissionStatus.APPROVED,
  SubmissionStatus.REJECTED,
  SubmissionStatus.PAID,
];

function buildSteps(submission: Submission) {
  const statusRank = STEP_ORDER.indexOf(
    submission.status as SubmissionStatus | 'CREATED'
  );

  return STEP_ORDER.filter((s) => {
    // Always show CREATED and PENDING; show others only when reached
    if (s === 'CREATED' || s === SubmissionStatus.PENDING) return true;
    const rank = STEP_ORDER.indexOf(s);
    // Skip the opposite terminal state
    if (
      s === SubmissionStatus.APPROVED &&
      submission.status === SubmissionStatus.REJECTED
    )
      return false;
    if (
      s === SubmissionStatus.REJECTED &&
      submission.status !== SubmissionStatus.REJECTED
    )
      return false;
    return rank <= statusRank;
  }).map((s) => ({
    status: s,
    label:
      s === 'CREATED'
        ? 'Submitted'
        : s
            .replace('_', ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase()),
    isCompleted: STEP_ORDER.indexOf(s) < statusRank,
    isCurrent:
      s === submission.status ||
      (s === 'CREATED' && submission.status === SubmissionStatus.PENDING),
    timestamp:
      s === 'CREATED'
        ? submission.createdAt
        : s === submission.status
          ? submission.updatedAt
          : undefined,
  }));
}

export function StatusTimeline({ submission }: StatusTimelineProps) {
  const steps = buildSteps(submission);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Status Timeline
      </h3>
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {index < steps.length - 1 && (
              <div
                className={`absolute left-[7px] top-6 h-full w-0.5 ${step.isCompleted ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                aria-hidden="true"
              />
            )}
            <div
              className={`relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${step.isCompleted ? 'bg-blue-600' : step.isCurrent ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30' : 'bg-zinc-200 dark:bg-zinc-700'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-medium ${step.isCurrent || step.isCompleted ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500'}`}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {formatTimelineDate(step.timestamp)}
                  </span>
                )}
              </div>
              {step.status === SubmissionStatus.REJECTED &&
                submission.rejectionReason && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {submission.rejectionReason}
                  </p>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
