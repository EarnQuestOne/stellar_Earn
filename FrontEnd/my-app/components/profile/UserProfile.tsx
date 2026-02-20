'use client';

import { useState } from 'react';
import type { UserProfile, ProfileStats, Achievement, Activity, EditProfileData } from '@/lib/types/profile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStats } from './ProfileStats';
import { AchievementsList } from './AchievementsList';
import { ActivityFeed } from './ActivityFeed';
import { EditProfileModal } from './EditProfileModal';

interface UserProfileProps {
  profile: UserProfile;
  stats: ProfileStats;
  achievements: Achievement[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updateError: string | null;
  onRefetch: () => Promise<void>;
  onUpdateProfile: (data: EditProfileData) => Promise<void>;
  onFollow: () => Promise<void>;
  onUnfollow: () => Promise<void>;
}

export function UserProfile({
  profile,
  stats,
  achievements,
  activities,
  isLoading,
  error,
  isUpdating,
  updateError,
  onRefetch,
  onUpdateProfile,
  onFollow,
  onUnfollow,
}: UserProfileProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditProfile = () => {
    if (profile?.isOwnProfile) {
      setIsEditModalOpen(true);
    }
  };

  const handleSaveProfile = async (data: EditProfileData) => {
    await onUpdateProfile(data);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-red-200 mb-2">
            Failed to load profile
          </h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={onRefetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          isLoading={isLoading}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          onEdit={handleEditProfile}
        />

        {/* Profile Stats */}
        <ProfileStats
          stats={stats}
          isLoading={isLoading}
        />

        {/* Achievements */}
        <AchievementsList
          achievements={achievements}
          isLoading={isLoading}
        />

        {/* Activity Feed */}
        <ActivityFeed
          activities={activities}
          isLoading={isLoading}
        />
      </div>

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          profile={profile}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onSave={handleSaveProfile}
          isUpdating={isUpdating}
        />
      )}

      {/* Update Error Toast */}
      {updateError && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{updateError}</span>
          </div>
        </div>
      )}
    </div>
  );
}