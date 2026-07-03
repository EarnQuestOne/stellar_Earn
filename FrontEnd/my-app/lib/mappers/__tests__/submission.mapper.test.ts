import { describe, it, expect } from 'vitest';
import { SubmissionMapper } from '../submission.mapper';
import type { SubmissionResponse } from '../../types/api.types';
import type { Submission } from '../../types/submission';

describe('SubmissionMapper', () => {
  const mockApiSubmission: SubmissionResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    questId: 'quest-123',
    userId: 'user-123',
    status: 'Approved',
    proof: {
      type: 'link',
      link: 'https://example.com/proof',
    },
    rejectionReason: undefined,
    approvedAt: '2026-01-24T08:00:00.000Z',
    approvedBy: 'verifier-123',
    rejectedAt: undefined,
    rejectedBy: undefined,
    createdAt: '2026-01-23T12:34:56.000Z',
    updatedAt: '2026-01-24T08:00:00.000Z',
    quest: {
      id: 'quest-123',
      title: 'Test Quest',
      rewardAmount: 10.5,
      rewardAsset: 'XLM',
    },
    user: {
      id: 'user-123',
      stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    },
  };

  describe('toDomain', () => {
    it('should convert API SubmissionResponse to UI Submission domain model', () => {
      const result = SubmissionMapper.toDomain(mockApiSubmission);

      expect(result.id).toBe(mockApiSubmission.id);
      expect(result.questId).toBe(mockApiSubmission.questId);
      expect(result.userId).toBe(mockApiSubmission.userId);
      expect(result.status).toBe('Approved');
      expect(result.createdAt).toBe(mockApiSubmission.createdAt);
      expect(result.updatedAt).toBe(mockApiSubmission.updatedAt);
    });

    it('should handle submission with rejection', () => {
      const rejectedSubmission: SubmissionResponse = {
        ...mockApiSubmission,
        status: 'Rejected',
        rejectionReason: 'Insufficient proof',
        rejectedAt: '2026-01-24T09:00:00.000Z',
        rejectedBy: 'verifier-456',
      };

      const result = SubmissionMapper.toDomain(rejectedSubmission);

      expect(result.status).toBe('Rejected');
      expect(result.rejectionReason).toBe('Insufficient proof');
      expect(result.rejectedAt).toBe('2026-01-24T09:00:00.000Z');
      expect(result.rejectedBy).toBe('verifier-456');
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of API SubmissionResponse to UI Submission domain models', () => {
      const apiSubmissions: SubmissionResponse[] = [
        mockApiSubmission,
        { ...mockApiSubmission, id: '456', status: 'Pending' },
      ];

      const result = SubmissionMapper.toDomainArray(apiSubmissions);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockApiSubmission.id);
      expect(result[1].id).toBe('456');
    });

    it('should return empty array for empty input', () => {
      const result = SubmissionMapper.toDomainArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('toApi', () => {
    it('should convert UI Submission domain model to API SubmissionResponse', () => {
      const domainSubmission: Submission = {
        id: mockApiSubmission.id,
        questId: mockApiSubmission.questId,
        userId: mockApiSubmission.userId,
        status: 'Approved',
        createdAt: mockApiSubmission.createdAt,
        updatedAt: mockApiSubmission.updatedAt,
        quest: mockApiSubmission.quest,
        user: mockApiSubmission.user,
        proof: mockApiSubmission.proof,
        rejectionReason: mockApiSubmission.rejectionReason,
        approvedAt: mockApiSubmission.approvedAt,
        approvedBy: mockApiSubmission.approvedBy,
        rejectedAt: mockApiSubmission.rejectedAt,
        rejectedBy: mockApiSubmission.rejectedBy,
      };

      const result = SubmissionMapper.toApi(domainSubmission);

      expect(result.id).toBe(domainSubmission.id);
      expect(result.questId).toBe(domainSubmission.questId);
      expect(result.userId).toBe(domainSubmission.userId);
      expect(result.status).toBe('Approved');
    });
  });

  describe('toApiArray', () => {
    it('should convert array of UI Submission domain models to API SubmissionResponse', () => {
      const domainSubmissions: Submission[] = [
        {
          ...mockApiSubmission,
          status: 'Approved',
        },
        {
          ...mockApiSubmission,
          id: '456',
          status: 'Pending',
        },
      ];

      const result = SubmissionMapper.toApiArray(domainSubmissions);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockApiSubmission.id);
      expect(result[1].id).toBe('456');
    });
  });
});
