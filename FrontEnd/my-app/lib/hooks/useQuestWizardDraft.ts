'use client';

import { useEffect, useCallback } from 'react';

const DRAFT_KEY = 'questWizardDraft';

/**
 * Fix #2224: persists QuestWizard form state to localStorage so a page
 * refresh or accidental navigation does not lose the user's draft.
 */
export function useQuestWizardDraft<T extends object>(
  formData: T,
  setFormData: (data: T) => void
) {
  // Restore saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        setFormData(JSON.parse(saved) as T);
      }
    } catch {
      // Ignore parse errors - corrupted draft is silently discarded
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft whenever form data changes
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    } catch {
      // Ignore storage quota errors
    }
  }, [formData]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { clearDraft };
}
