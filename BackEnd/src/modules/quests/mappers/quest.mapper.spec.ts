import { QuestMapper } from './quest.mapper';
import { QuestResponseDto } from '../dto/quest-response.dto';
import { Quest } from '../entities/quest.entity';
import { QuestDifficulty } from '../enums/quest-difficulty.enum';

describe('QuestMapper', () => {
  const mockQuest: Quest = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Quest',
    description: 'Test Description',
    rewardAmount: 10.5,
    status: 'ACTIVE',
    createdBy: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    createdAt: new Date('2026-01-23T12:34:56.000Z'),
    updatedAt: new Date('2026-01-24T08:00:00.000Z'),
    difficulty: QuestDifficulty.BEGINNER,
  };

  describe('toDto', () => {
    it('should convert Quest entity to QuestResponseDto', () => {
      const result = QuestMapper.toDto(mockQuest);

      expect(result).toBeInstanceOf(QuestResponseDto);
      expect(result.id).toBe(mockQuest.id);
      expect(result.title).toBe(mockQuest.title);
      expect(result.description).toBe(mockQuest.description);
      expect(result.rewardAmount).toBe(mockQuest.rewardAmount);
      expect(result.status).toBe(mockQuest.status);
      expect(result.createdBy).toBe(mockQuest.createdBy);
      expect(result.createdAt).toBe(mockQuest.createdAt);
      expect(result.updatedAt).toBe(mockQuest.updatedAt);
      expect(result.difficulty).toBe(mockQuest.difficulty);
    });

    it('should handle quest without difficulty', () => {
      const questWithoutDifficulty = { ...mockQuest, difficulty: undefined };
      const result = QuestMapper.toDto(questWithoutDifficulty);

      expect(result.difficulty).toBeUndefined();
    });
  });

  describe('toDtoArray', () => {
    it('should convert array of Quest entities to QuestResponseDto array', () => {
      const quests: Quest[] = [
        mockQuest,
        { ...mockQuest, id: '456', title: 'Second Quest' },
      ];

      const result = QuestMapper.toDtoArray(quests);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(QuestResponseDto);
      expect(result[1]).toBeInstanceOf(QuestResponseDto);
      expect(result[0].id).toBe(mockQuest.id);
      expect(result[1].id).toBe('456');
    });

    it('should return empty array for empty input', () => {
      const result = QuestMapper.toDtoArray([]);
      expect(result).toEqual([]);
    });
  });

  describe('fromEntity (legacy alias)', () => {
    it('should call toDto for backward compatibility', () => {
      const result = QuestMapper.fromEntity(mockQuest);

      expect(result).toBeInstanceOf(QuestResponseDto);
      expect(result.id).toBe(mockQuest.id);
    });
  });
});
