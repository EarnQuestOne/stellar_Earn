'use client';

import { useState, useEffect, useCallback } from 'react';
import type { 
  ProfileData, 
  UserProfile, 
  ProfileStats, 
  Achievement, 
  Activity, 
  EditProfileData 
} from '../types/profile';
import {
  fetchUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  fetchUserAchievements,
  fetchUserActivities,
} from '../api/profile';

interface UseProfileReturn {
  profile: UserProfile | null;
  stats: ProfileStats | null;
  achievements: Achievement[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updateError: string | null;
  refetch: () => Promise<void>;
  updateProfileData: (data: EditProfileData) => Promise<void>;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchActivities: () => Promise<void>;
}

export function useProfile(address: string): UseProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!address) {
      setError('No address provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data: ProfileData = await fetchUserProfile(address);
      setProfile(data.profile);
      setStats(data.stats);
      setAchievements(data.achievements);
      setActivities(data.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile data');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const updateProfileData = useCallback(async (data: EditProfileData) => {
    if (!profile) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const updatedProfile = await updateProfile(profile.stellarAddress, data);
      setProfile(updatedProfile);
      // Update stats if needed
      if (stats) {
        setStats({
          ...stats,
          xp: updatedProfile.xp,
          level: updatedProfile.level,
        });
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  }, [profile, stats]);

  const follow = useCallback(async () => {
    if (!profile || profile.isOwnProfile) return;

    try {
      await followUser(profile.stellarAddress);
      setProfile({
        ...profile,
        isFollowing: true,
        followersCount: profile.followersCount + 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow user');
    }
  }, [profile]);

  const unfollow = useCallback(async () => {
    if (!profile || profile.isOwnProfile) return;

    try {
      await unfollowUser(profile.stellarAddress);
      setProfile({
        ...profile,
        isFollowing: false,
        followersCount: profile.followersCount - 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
    }
  }, [profile]);

  const fetchAchievements = useCallback(async () => {
    if (!profile) return;

    try {
      const userAchievements = await fetchUserAchievements(profile.stellarAddress);
      setAchievements(userAchievements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch achievements');
    }
  }, [profile]);

  const fetchActivities = useCallback(async () => {
    if (!profile) return;

    try {
      const userActivities = await fetchUserActivities(profile.stellarAddress);
      setActivities(userActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    stats,
    achievements,
    activities,
    isLoading,
    error,
    isUpdating,
    updateError,
    refetch: fetchData,
    updateProfileData,
    follow,
    unfollow,
    fetchAchievements,
    fetchActivities,
  };
}