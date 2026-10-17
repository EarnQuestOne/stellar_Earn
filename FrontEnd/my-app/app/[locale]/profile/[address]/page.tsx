'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserProfile } from '@/components/profile/UserProfile';
import { useProfile } from '@/lib/hooks/useProfile';

export default function ProfilePage() {
  const params = useParams();
  const address = (params?.address ?? '') as string;

  const { refetch, updateProfileData, follow, unfollow } = useProfile(address);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <UserProfile
          onRefetch={refetch}
          onUpdateProfile={updateProfileData}
          onFollow={follow}
          onUnfollow={unfollow}
        />
      </div>
    </AppLayout>
  );
}
