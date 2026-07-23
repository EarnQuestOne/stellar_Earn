import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Quest } from '@/types/quest';

interface MutationContext {
  previousQuests?: Quest[];
}

// Mock API calls
const completeQuestApi = async (questId: string): Promise<Quest> => {
  const res = await fetch(`/api/quests/${questId}/complete`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to complete quest');
  return res.json();
};

const claimQuestApi = async (questId: string): Promise<Quest> => {
  const res = await fetch(`/api/quests/${questId}/claim`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to claim reward');
  return res.json();
};

export const useQuestMutations = () => {
  const queryClient = useQueryClient();

  // Optimistic Complete Quest Mutation
  const completeQuestMutation = useMutation<Quest, Error, string, MutationContext>({
    mutationFn: completeQuestApi,

    // 1. Cancel ongoing refetches so they don't overwrite optimistic update
    onMutate: async (questId) => {
      await queryClient.cancelQueries({ queryKey: ['quests'] });

      // Snapshot previous state for rollback
      const previousQuests = queryClient.getQueryData<Quest[]>(['quests']);

      // Optimistically update cache
      queryClient.setQueryData<Quest[]>(['quests'], (old = []) =>
        old.map((q) =>
          q.id === questId ? { ...q, status: 'completed', progress: 100 } : q,
        ),
      );

      return { previousQuests };
    },

    // 2. Rollback on failure
    onError: (_err, _questId, context) => {
      if (context?.previousQuests) {
        queryClient.setQueryData(['quests'], context.previousQuests);
      }
    },

    // 3. Always refetch after error or success to sync server truth
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  // Optimistic Claim Reward Mutation
  const claimQuestMutation = useMutation<Quest, Error, string, MutationContext>({
    mutationFn: claimQuestApi,

    onMutate: async (questId) => {
      await queryClient.cancelQueries({ queryKey: ['quests'] });

      const previousQuests = queryClient.getQueryData<Quest[]>(['quests']);

      // Optimistically mark as claimed
      queryClient.setQueryData<Quest[]>(['quests'], (old = []) =>
        old.map((q) => (q.id === questId ? { ...q, status: 'claimed' } : q)),
      );

      return { previousQuests };
    },

    onError: (_err, _questId, context) => {
      if (context?.previousQuests) {
        queryClient.setQueryData(['quests'], context.previousQuests);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });

  return {
    completeQuest: completeQuestMutation.mutate,
    claimQuest: claimQuestMutation.mutate,
    isCompleting: completeQuestMutation.isPending,
    isClaiming: claimQuestMutation.isPending,
  };
};