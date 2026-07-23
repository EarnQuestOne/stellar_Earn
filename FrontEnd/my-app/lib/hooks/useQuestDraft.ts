'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  QuestWizardData,
  QuestWizardStepIndex,
} from '@/lib/schemas/quest.schema';
import { defaultQuestWizardData } from '@/lib/schemas/quest.schema';

const STORAGE_KEY = 'stellar_earn_quest_wizard_draft_v1';

interface StoredDraft {
  data: QuestWizardData;
  step: QuestWizardStepIndex;
  updatedAt: string;
}

interface UseQuestDraftOptions {
  autosave?: boolean;
  autosaveDelayMs?: number;
}

/**
 * Merges a stored draft over the current defaults.
 *
 * Drafts are persisted as a plain snapshot, so one saved before a new section
 * was added to `QuestWizardData` would be missing that key and crash the step
 * that reads it. Filling gaps from the defaults keeps older drafts loadable.
 */
function normalizeDraftData(stored: Partial<QuestWizardData>): QuestWizardData {
  return {
    ...defaultQuestWizardData,
    ...stored,
    basics: { ...defaultQuestWizardData.basics, ...stored.basics },
    requirements: {
      ...defaultQuestWizardData.requirements,
      ...stored.requirements,
    },
    reward: { ...defaultQuestWizardData.reward, ...stored.reward },
    timeline: { ...defaultQuestWizardData.timeline, ...stored.timeline },
    verification: {
      ...defaultQuestWizardData.verification,
      ...stored.verification,
    },
    advanced: { ...defaultQuestWizardData.advanced, ...stored.advanced },
  };
}

export function useQuestDraft(
  data: QuestWizardData,
  step: QuestWizardStepIndex,
  options: UseQuestDraftOptions = {}
) {
  const { autosave = true, autosaveDelayMs = 2000 } = options;
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setHasDraft(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredDraft;
      setHasDraft(true);
      setLastSavedAt(parsed.updatedAt ?? null);
    } catch {
      setHasDraft(false);
    }
  }, []);

  const saveDraft = useCallback(
    (nextData: QuestWizardData, nextStep: QuestWizardStepIndex) => {
      if (typeof window === 'undefined') {
        return;
      }

      const payload: StoredDraft = {
        data: nextData,
        step: nextStep,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(payload.updatedAt);
      setHasDraft(true);
    },
    []
  );

  const loadDraft = useCallback((): StoredDraft | null => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredDraft;
      if (!parsed?.data || typeof parsed?.step !== 'number') {
        return null;
      }

      setLastSavedAt(parsed.updatedAt ?? null);
      setHasDraft(true);
      setHasLoadedDraft(true);
      return { ...parsed, data: normalizeDraftData(parsed.data) };
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setLastSavedAt(null);
    setHasDraft(false);
  }, []);

  useEffect(() => {
    if (!autosave || typeof window === 'undefined') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveDraft(data, step);
    }, autosaveDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autosave, autosaveDelayMs, data, saveDraft, step]);

  const draftMeta = useMemo(() => {
    return {
      hasDraft,
      lastSavedAt,
      hasLoadedDraft,
    };
  }, [hasDraft, hasLoadedDraft, lastSavedAt]);

  return {
    defaultData: defaultQuestWizardData,
    saveDraft,
    loadDraft,
    clearDraft,
    draftMeta,
  };
}
