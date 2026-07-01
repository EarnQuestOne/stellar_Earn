import { describe, it, expect } from 'vitest';
import { QuestDifficulty, QuestStatus } from '@/lib/types/quest';

describe('QuestDifficulty and QuestStatus runtime object exports', () => {
  it('exports QuestStatus as a runtime object', () => {
    expect(typeof QuestStatus).toBe('object');
    expect(QuestStatus).toBeDefined();
  });

  it('QuestStatus has expected keys', () => {
    expect(QuestStatus.ACTIVE).toBe('Active');
    expect(QuestStatus.PAUSED).toBe('Paused');
    expect(QuestStatus.COMPLETED).toBe('Completed');
    expect(QuestStatus.EXPIRED).toBe('Expired');
  });

  it('exports QuestDifficulty as a runtime object', () => {
    expect(typeof QuestDifficulty).toBe('object');
    expect(QuestDifficulty).toBeDefined();
  });

  it('QuestDifficulty has expected keys', () => {
    expect(QuestDifficulty.EASY).toBe('beginner');
    expect(QuestDifficulty.MEDIUM).toBe('intermediate');
    expect(QuestDifficulty.HARD).toBe('advanced');
  });

  it('QuestStatus values are strings', () => {
    Object.values(QuestStatus).forEach((v) => expect(typeof v).toBe('string'));
  });

  it('QuestDifficulty values are strings', () => {
    Object.values(QuestDifficulty).forEach((v) => expect(typeof v).toBe('string'));
  });
});
