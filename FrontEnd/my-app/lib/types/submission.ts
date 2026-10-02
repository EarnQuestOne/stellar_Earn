import type { SubmissionResponse } from './api.types';
import type { Quest } from './quest';

export const SubmissionStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
  UNDER_REVIEW: 'Under Review',
} as const;

export type SubmissionStatus =
  'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Under Review';

export type ApiSubmissionStatus = SubmissionStatus;

export interface Submission extends Omit<
  Partial<SubmissionResponse>,
  'status' | 'proof'
> {
  id: string;
  questId: string;
  userId: string;
  status: ApiSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  quest?: Partial<Quest> & SubmissionResponse['quest']; // Made optional to match SubmissionResponse
  proof: Record<string, unknown>;
}

export interface SubmissionFilters {
  status?: SubmissionStatus | ApiSubmissionStatus;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
    cursor?: string;
    nextCursor?: string;
  };
}
