
export interface Submission extends Partial<SubmissionResponse> {
  id: string;
  questId: string;
  userId: string;
  status: ApiSubmissionStatus;
  createdAt: string;
  updatedAt: string;
  quest?: Quest; // Made optional to match SubmissionResponse
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
