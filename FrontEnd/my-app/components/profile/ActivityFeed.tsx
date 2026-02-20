'use client';

import type { Activity } from '@/lib/types/profile';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📰</div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No activity yet</h3>
          <p className="text-zinc-500">Your recent actions will appear here</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quest_completed': return '✅';
      case 'quest_created': return '➕';
      case 'submission_approved': return '✅';
      case 'level_up': return '🏆';
      case 'badge_earned': return '🏅';
      default: return '📰';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quest_completed': return 'text-green-400';
      case 'quest_created': return 'text-blue-400';
      case 'submission_approved': return 'text-green-400';
      case 'level_up': return 'text-yellow-400';
      case 'badge_earned': return 'text-purple-400';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-zinc-800 last:border-0 last:pb-0">
            <div className="flex-shrink-0 mt-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${getActivityColor(activity.type)}
                bg-zinc-800
              `}>
                {getActivityIcon(activity.type)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white mb-1">
                {activity.title}
              </h3>
              <p className="text-sm text-zinc-400 mb-2">
                {activity.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>
                  {new Date(activity.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {activity.relatedId && (
                  <span className="px-2 py-1 bg-zinc-800 rounded">
                    ID: {activity.relatedId}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activities.length > 10 && (
        <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
          <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}