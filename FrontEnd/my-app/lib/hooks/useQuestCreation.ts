'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import { createQuest } from '@/lib/api/quests';
import type { CreateQuestRequest, QuestResponse } from '@/lib/types/api.types';

interface CreateQuestResult {
  success: boolean;
  quest?: QuestResponse;
  error?: string;
}

export function useQuestCreation() {
  const { user } = useAuth();
  const { address } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifierAddress = useMemo(
    () => user?.stellarAddress ?? address ?? null,
    [address, user?.stellarAddress]
  );

  const create = useCallback(
    async (payload: CreateQuestRequest): Promise<CreateQuestResult> => {
      setIsCreating(true);
      setError(null);

      try {
        const quest = await createQuest(payload);
        return { success: true, quest };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create quest';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return {
    create,
    isCreating,
    error,
    verifierAddress,
  };
}
