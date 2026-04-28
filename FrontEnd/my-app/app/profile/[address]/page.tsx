'use client';

import { useParams } from 'next/navigation';
import { UserProfile } from '@/components/profile/UserProfile';
import { useProfile } from '@/lib/hooks/useProfile';

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;

  const { refetch, updateProfileData, follow, unfollow } = useProfile(address);

  return (
    <UserProfile
      onRefetch={refetch}
      onUpdateProfile={updateProfileData}
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
