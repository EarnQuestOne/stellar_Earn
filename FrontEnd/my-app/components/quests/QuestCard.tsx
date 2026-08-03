'use client';

import React from 'react';
import { Quest } from '@/types/quest';
import { useQuestMutations } from '@/hooks/useQuestMutations';

interface QuestCardProps {
  quest: Quest;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest }) => {
  const { completeQuest, claimQuest, isCompleting, isClaiming } = useQuestMutations();

  return (
    <div className="p-4 border rounded-xl shadow-sm bg-white dark:bg-gray-900 flex items-center justify-between">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{quest.title}</h4>
        <p className="text-xs text-gray-500">Reward: {quest.rewardAmount} XP</p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 dark:bg-gray-700">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${quest.progress}%` }}
          />
        </div>
      </div>

      <div>
        {quest.status === 'in_progress' && (
          <button
            onClick={() => completeQuest(quest.id)}
            disabled={isCompleting}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Complete
          </button>
        )}

        {quest.status === 'completed' && (
          <button
            onClick={() => claimQuest(quest.id)}
            disabled={isClaiming}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            Claim Reward
          </button>
        )}

        {quest.status === 'claimed' && (
          <span className="text-xs font-semibold text-gray-400">Claimed ✓</span>
        )}
      </div>
    </div>
  );
};