import { describe, it, expect } from 'vitest';
import { getQuests, getQuestById } from './quests';

describe('Quests API Integration Tests', () => {
  it('should fetch quests successfully with mock data', async () => {
    const response = await getQuests();

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.data[0].id).toBe('quest-1');
    expect(response.data[0].title).toBe('Test Quest 1');
    expect(response.meta.total).toBe(1);
  });

  it('should fetch a single quest by ID successfully', async () => {
    const response = await getQuestById('quest-123');

    expect(response).toBeDefined();
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe('quest-123');
    expect(response.data.title).toBe('Test Quest quest-123');
    expect(response.data.rewardAmount).toBe(50);
  });
});
