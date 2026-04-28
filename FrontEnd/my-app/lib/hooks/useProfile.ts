'use client';

import { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import type { ProfileData, EditProfileData } from '../types/profile';
import {
  fetchUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  fetchUserAchievements,
  fetchUserActivities,
} from '../api/profile';

export function useProfile(address: string) {
  const profile = useStore((s) => s.profile);
  const stats = useStore((s) => s.stats);
  const achievements = useStore((s) => s.achievements);
  const activities = useStore((s) => s.activities);
  const isLoading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  const isUpdating = useStore((s) => s.isUpdating);
  const updateError = useStore((s) => s.updateError);

  const setUserData = useStore((s) => s.setUserData);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);
  const setUpdating = useStore((s) => s.setUpdating);
  const setUpdateError = useStore((s) => s.setUpdateError);

  const fetchData = useCallback(async () => {
    if (!address) {
      setError('No address provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: ProfileData = await fetchUserProfile(address);
      setUserData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch profile data'
      );
    } finally {
      setLoading(false);
    }
  }, [address]);

  const updateProfileData = useCallback(
    async (data: EditProfileData) => {
      if (!profile) return;

      setUpdating(true);
      setUpdateError(null);

      try {
        const updatedProfile = await updateProfile(
          profile.stellarAddress,
          data
        );
        setUserData({
          profile: updatedProfile,
          stats: stats
            ? { ...stats, xp: updatedProfile.xp, level: updatedProfile.level }
            : stats!,
          achievements,
          activities,
        });
      } catch (err) {
        setUpdateError(
          err instanceof Error ? err.message : 'Failed to update profile'
        );
      } finally {
        setUpdating(false);
      }
    },
    [profile, stats, achievements, activities]
  );

  const follow = useCallback(async () => {
    if (!profile || profile.isOwnProfile) return;
    try {
      await followUser(profile.stellarAddress);
      setUserData({
        profile: {
          ...profile,
          isFollowing: true,
          followersCount: profile.followersCount + 1,
        },
        stats: stats!,
        achievements,
        activities,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow user');
    }
  }, [profile, stats, achievements, activities]);

  const unfollow = useCallback(async () => {
    if (!profile || profile.isOwnProfile) return;
    try {
      await unfollowUser(profile.stellarAddress);
      setUserData({
        profile: {
          ...profile,
          isFollowing: false,
          followersCount: profile.followersCount - 1,
        },
        stats: stats!,
        achievements,
        activities,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow user');
    }
  }, [profile, stats, achievements, activities]);

  const fetchAchievements = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchUserAchievements(profile.stellarAddress);
      setUserData({
        profile: profile!,
        stats: stats!,
        achievements: data,
        activities,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch achievements'
      );
    }
  }, [profile, stats, activities]);

  const fetchActivities = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchUserActivities(profile.stellarAddress);
      setUserData({
        profile: profile!,
        stats: stats!,
        achievements,
        activities: data,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch activities'
      );
    }
  }, [profile, stats, achievements]);

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
