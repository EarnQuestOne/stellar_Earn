export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PAID = 'PAID',
  WITHDRAWN = 'WITHDRAWN',
}

export const VALID_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  [SubmissionStatus.PENDING]: [
    SubmissionStatus.UNDER_REVIEW,
    SubmissionStatus.APPROVED,
    SubmissionStatus.REJECTED,
    SubmissionStatus.WITHDRAWN,
  ],
  [SubmissionStatus.UNDER_REVIEW]: [
    SubmissionStatus.PENDING,
    SubmissionStatus.APPROVED,
    SubmissionStatus.REJECTED,
  ],
  [SubmissionStatus.APPROVED]: [SubmissionStatus.PAID],
  [SubmissionStatus.REJECTED]: [SubmissionStatus.PENDING],
  [SubmissionStatus.PAID]: [],
  [SubmissionStatus.WITHDRAWN]: [],
};

export class SubmissionStateMachine {
  static canTransition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    return allowedTransitions?.includes(newStatus) ?? false;
  }

  static transition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): SubmissionStatus {
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
    return newStatus;
  }
}