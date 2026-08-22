import { describe, it, expect } from 'vitest';
import { QuestMapper } from '../quest.mapper';
import type { QuestResponse } from '../../types/api.types';
import type { Quest } from '../../types/quest';

describe('QuestMapper', () => {
  const mockApiQuest: QuestResponse = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    contractQuestId: 'contract-123',
    title: 'Test Quest',
    description: 'Test Description',
    category: 'General',
    difficulty: 'beginner',
    rewardAsset: 'XLM',
    rewardAmount: 10.5,
    xpReward: 100,
    verifierAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    status: 'Active',
    totalClaims: 5,
    totalSubmissions: 10,
    approvedSubmissions: 8,
    rejectedSubmissions: 2,
    createdAt: '2026-01-23T12:34:56.000Z',
    updatedAt: '2026-01-24T08:00:00.000Z',
  };

  describe('toDomain', () => {
    it('should convert API QuestResponse to UI Quest domain model', () => {
      const result = QuestMapper.toDomain(mockApiQuest);

      expect(result.id).toBe(mockApiQuest.id);
      expect(result.title).toBe(mockApiQuest.title);
      expect(result.status).toBe('Active');
      expect(result.difficulty).toBe('beginner');
    });

    it('should handle quest without difficulty', () => {
      const questWithoutDifficulty = { ...mockApiQuest, difficulty: undefined };
      const result = QuestMapper.toDomain(questWithoutDifficulty);

      expect(result.difficulty).toBeUndefined();
    });
  });

  describe('toDomainArray', () => {
    it('should convert array of API QuestResponse to UI Quest domain models', () => {
      const apiQuests: QuestResponse[] = [
        mockApiQuest,
        { ...mockApiQuest, id: '456', title: 'Second Quest' },
      ];

      const result = QuestMapper.toDomainArray(apiQuests);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockApiQuest.id);
      expect(result[1].id).toBe('456');
    });

    it('should return empty array for empty input', () => {
      const result = QuestMapper.toDomainArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('toApi', () => {
    it('should convert UI Quest domain model to API QuestResponse', () => {
      const domainQuest: Quest = {
        ...mockApiQuest,
        status: 'Active',
        difficulty: 'beginner',
      };

      const result = QuestMapper.toApi(domainQuest);

      expect(result.id).toBe(domainQuest.id);
      expect(result.title).toBe(domainQuest.title);
      expect(result.status).toBe('Active');
    });
  });

  describe('toApiArray', () => {
    it('should convert array of UI Quest domain models to API QuestResponse', () => {
      const domainQuests: Quest[] = [
        { ...mockApiQuest, status: 'Active', difficulty: 'beginner' },
        {
          ...mockApiQuest,
          id: '456',
          status: 'Active',
          difficulty: 'intermediate',
        },
      ];

      const result = QuestMapper.toApiArray(domainQuests);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockApiQuest.id);
      expect(result[1].id).toBe('456');
    });
  });
});
