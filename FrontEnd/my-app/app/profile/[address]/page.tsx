'use client';

import { useParams } from 'next/navigation';
import { UserProfile } from '@/components/profile/UserProfile';
import { useProfile } from '@/lib/hooks/useProfile';

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  
  const {
    profile,
    stats,
    achievements,
    activities,
    isLoading,
    error,
    isUpdating,
    updateError,
    refetch,
    updateProfileData,
    follow,
    unfollow,
  } = useProfile(address);

  return (
    <UserProfile
      profile={profile}
      stats={stats}
      achievements={achievements}
      activities={activities}
      isLoading={isLoading}
      error={error}
      isUpdating={isUpdating}
      updateError={updateError}
      onRefetch={refetch}
      onUpdateProfile={updateProfileData}
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}