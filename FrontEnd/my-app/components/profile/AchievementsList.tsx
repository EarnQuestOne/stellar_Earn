'use client';

import type { Achievement } from '@/lib/types/profile';

interface AchievementsListProps {
  achievements: Achievement[];
  isLoading: boolean;
}

export function AchievementsList({ achievements, isLoading }: AchievementsListProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-zinc-800 rounded-lg p-4 animate-pulse">
              <div className="h-12 w-12 bg-zinc-700 rounded-full mx-auto mb-3" />
              <div className="h-4 bg-zinc-700 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-zinc-700 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!achievements || achievements.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Achievements</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No achievements yet</h3>
          <p className="text-zinc-500">Complete quests to earn badges and achievements!</p>
        </div>
      </div>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-zinc-600 bg-zinc-900/50';
      case 'rare': return 'border-blue-500 bg-blue-900/20';
      case 'epic': return 'border-purple-500 bg-purple-900/20';
      case 'legendary': return 'border-yellow-500 bg-yellow-900/20';
      default: return 'border-zinc-600 bg-zinc-900/50';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'shadow-zinc-500/20';
      case 'rare': return 'shadow-blue-500/30';
      case 'epic': return 'shadow-purple-500/30';
      case 'legendary': return 'shadow-yellow-500/30';
      default: return 'shadow-zinc-500/20';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <span className="text-sm text-zinc-400">
          {achievements.length} earned
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              bg-zinc-800 rounded-lg p-4 border transition-all duration-300 hover:scale-105
              ${getRarityColor(achievement.rarity)}
              shadow-lg ${getRarityGlow(achievement.rarity)}
            `}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{achievement.icon}</div>
              <h3 className="font-bold text-white mb-2">{achievement.name}</h3>
              <p className="text-sm text-zinc-400 mb-3">{achievement.description}</p>
              <div className="flex justify-between items-center text-xs">
                <span className={`
                  px-2 py-1 rounded-full
                  ${achievement.rarity === 'common' ? 'bg-zinc-700 text-zinc-300' : ''}
                  ${achievement.rarity === 'rare' ? 'bg-blue-800 text-blue-300' : ''}
                  ${achievement.rarity === 'epic' ? 'bg-purple-800 text-purple-300' : ''}
                  ${achievement.rarity === 'legendary' ? 'bg-yellow-800 text-yellow-300' : ''}
                `}>
                  {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                </span>
                <span className="text-zinc-500">
                  {new Date(achievement.earnedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rarity Legend */}
      <div className="mt-8 pt-6 border-t border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Rarity Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-500 rounded-full"></div>
            <span className="text-xs text-zinc-400">Common</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-zinc-400">Rare</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-xs text-zinc-400">Epic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs text-zinc-400">Legendary</span>
          </div>
        </div>
      </div>
    </div>
  );
}