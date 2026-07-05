import { describe, it, expect } from 'vitest';
import { SubmissionStatus, submissionStatusSchema } from '../submission.types';

describe('Issue #802 [FE-013]: Canonical SubmissionStatus Evaluation Suite', () => {
  it('should explicitly expose the structural enum properties correctly', () => {
    expect(SubmissionStatus.IDLE).toBe('IDLE');
    expect(SubmissionStatus.SIGNING).toBe('SIGNING');
    expect(SubmissionStatus.SUCCESS).toBe('SUCCESS');
    expect(SubmissionStatus.FAILED).toBe('FAILED');
  });

  it('should cleanly parse valid state string codes through the schema array', () => {
    const validStates = [
      'IDLE',
      'VALIDATING',
      'SIGNING',
      'SUBMITTING',
      'SUCCESS',
      'FAILED',
    ];

    validStates.forEach((state) => {
      const parseResult = submissionStatusSchema.safeParse(state);
      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.data).toBe(state);
      }
    });
  });

  it('should systematically reject malicious or non-conforming status codes', () => {
    const invalidInputs = [
      'PENDING',
      'COMPLETED',
      'idle',
      '',
      null,
      undefined,
      1024,
    ];

    invalidInputs.forEach((input) => {
      const parseResult = submissionStatusSchema.safeParse(input);
      expect(parseResult.success).toBe(false);
    });
  });
});
