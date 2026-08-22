import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useQuestDraft } from './useQuestDraft';
import {
  DEFAULT_QUEST_DIFFICULTY,
  DEFAULT_QUEST_MAX_PARTICIPANTS,
  defaultQuestWizardData,
} from '@/lib/schemas/quest.schema';

const STORAGE_KEY = 'stellar_earn_quest_wizard_draft_v1';

describe('useQuestDraft', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('backfills sections missing from an older stored draft', () => {
    // A draft persisted before the `advanced` section existed.
    const legacyData = { ...defaultQuestWizardData } as Record<
      string,
      unknown
    > & { advanced?: unknown };
    delete legacyData.advanced;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data: legacyData,
        step: 2,
        updatedAt: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useQuestDraft(defaultQuestWizardData, 0, { autosave: false })
    );

    let loaded: ReturnType<typeof result.current.loadDraft> = null;
    act(() => {
      loaded = result.current.loadDraft();
    });

    expect(loaded).not.toBeNull();
    // Without backfilling, reading `advanced` here would throw.
    expect(loaded!.data.advanced.difficulty).toBe(DEFAULT_QUEST_DIFFICULTY);
    expect(loaded!.data.advanced.maxParticipants).toBe(
      DEFAULT_QUEST_MAX_PARTICIPANTS
    );
    expect(loaded!.data.advanced.tags).toEqual([]);
  });

  it('preserves values stored in a current draft', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        data: {
          ...defaultQuestWizardData,
          basics: {
            ...defaultQuestWizardData.basics,
            title: 'Saved title',
          },
          advanced: {
            difficulty: 'expert',
            maxParticipants: 12,
            tags: ['rust'],
          },
        },
        step: 1,
        updatedAt: new Date().toISOString(),
      })
    );

    const { result } = renderHook(() =>
      useQuestDraft(defaultQuestWizardData, 0, { autosave: false })
    );

    let loaded: ReturnType<typeof result.current.loadDraft> = null;
    act(() => {
      loaded = result.current.loadDraft();
    });

    expect(loaded!.data.basics.title).toBe('Saved title');
    expect(loaded!.data.advanced).toEqual({
      difficulty: 'expert',
      maxParticipants: 12,
      tags: ['rust'],
    });
    expect(loaded!.step).toBe(1);
  });

  it('returns null when no draft is stored', () => {
    const { result } = renderHook(() =>
      useQuestDraft(defaultQuestWizardData, 0, { autosave: false })
    );

    let loaded: ReturnType<typeof result.current.loadDraft> = null;
    act(() => {
      loaded = result.current.loadDraft();
    });

    expect(loaded).toBeNull();
  });
});
