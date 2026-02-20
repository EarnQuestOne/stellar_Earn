'use client';

import { useState } from 'react';
import type { UserProfile } from '@/lib/types/profile';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/notifications/useToast';

interface ProfileHeaderProps {
  profile: UserProfile;
  isLoading: boolean;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onEdit?: () => void;
}

export function ProfileHeader({ 
  profile, 
  isLoading, 
  onFollow, 
  onUnfollow, 
  onEdit 
}: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(profile?.isFollowing || false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleFollow = async () => {
    if (!profile || profile.isOwnProfile) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow?.();
        setIsFollowing(false);
        toast.success('Unfollowed user');
      } else {
        await onFollow?.();
        setIsFollowing(true);
        toast.success('Following user');
      }
    } catch (error) {
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar skeleton */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-zinc-800 animate-pulse" />
          </div>
          
          {/* Info skeleton */}
          <div className="flex-1 w-full">
            <div className="h-8 bg-zinc-800 rounded w-1/3 mb-2 animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded w-1/4 mb-4 animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-zinc-700">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-zinc-900"></div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">
              {profile.username}
            </h1>
            
            {!profile.isOwnProfile && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollow}
                disabled={followLoading}
                className={isFollowing ? "border-zinc-600 text-zinc-300 hover:bg-zinc-800" : ""}
              >
                {followLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    {isFollowing ? 'Unfollowing...' : 'Following...'}
                  </span>
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </Button>
            )}
            
            {profile.isOwnProfile && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                Edit Profile
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-400 mb-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Online
            </span>
            <span>Level {profile.level}</span>
            <span>{profile.followersCount} followers</span>
            <span>{profile.followingCount} following</span>
          </div>

          {profile.bio && (
            <p className="text-zinc-300 max-w-2xl">
              {profile.bio}
            </p>
          )}

          <div className="mt-3 text-xs text-zinc-500">
            Joined {new Date(profile.joinDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mt-6 pt-6 border-t border-zinc-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-white">{profile.questsCompleted}</div>
            <div className="text-xs text-zinc-400">Quests Completed</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{profile.xp.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Total XP</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">
              {profile.totalEarnings.toLocaleString()} XLM
            </div>
            <div className="text-xs text-zinc-400">Earned</div>
          </div>
          <div>
            <div className="text-xl font-bold text-white">{profile.currentStreak}</div>
            <div className="text-xs text-zinc-400">Day Streak</div>
          </div>
        </div>
      </div>
    </div>
  );
}