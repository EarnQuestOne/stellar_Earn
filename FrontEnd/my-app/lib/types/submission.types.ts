import { z } from 'zod';

/**
 * Canonical runtime states for an application submission lifecycle.
 */
export enum SubmissionStatus {
  IDLE = 'IDLE',
  VALIDATING = 'VALIDATING',
  SIGNING = 'SIGNING',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/**
 * Zod validation runtime validator for state payloads and backend boundaries.
 */
export const submissionStatusSchema = z.nativeEnum(SubmissionStatus);

export type SubmissionStatusType = z.infer<typeof submissionStatusSchema>;

/**
 * Interface representing a standardized submission payload wrapper state.
 */
export interface SubmissionState {
  status: SubmissionStatus;
  error: string | null;
  txHash?: string;
  updatedAt: number;
}
