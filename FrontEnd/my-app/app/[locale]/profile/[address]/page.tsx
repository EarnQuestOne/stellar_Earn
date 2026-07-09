'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserProfile } from '@/components/profile/UserProfile';
import { useProfile } from '@/lib/hooks/useProfile';

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const { profileData, isLoading, refetch, updateProfileData, follow, unfollow } = useProfile(address);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <UserProfile
          address={address}
          profile={profileData}
          isLoading={isLoading}
          onRefetch={refetch}
          onUpdateProfile={updateProfileData}
          onFollow={follow}
          onUnfollow={unfollow}
        />
      </div>
    </AppLayout>
  );
}
