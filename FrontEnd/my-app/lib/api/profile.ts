import type {
  ProfileData,
  UserProfile,
  Achievement,
  Activity,
  EditProfileData,
} from '../types/profile';
import { get, post, patch } from './client';

export async function fetchUserProfile(address: string): Promise<ProfileData> {
  return get<ProfileData>(`/profiles/${address}`);
}

export async function updateProfile(
  address: string,
  data: EditProfileData
): Promise<UserProfile> {
  return patch<UserProfile>(`/profiles/${address}`, data);
}

export async function followUser(address: string): Promise<void> {
  await post(`/profiles/${address}/follow`);
}

export async function unfollowUser(address: string): Promise<void> {
  await post(`/profiles/${address}/unfollow`);
}

export async function fetchUserAchievements(
  address: string
): Promise<Achievement[]> {
  return get<Achievement[]>(`/profiles/${address}/achievements`);
}

export async function fetchUserActivities(
  address: string
): Promise<Activity[]> {
  return get<Activity[]>(`/profiles/${address}/activities`);
}

export interface ProfileOverview {
  profile: ProfileData;
  achievements: Achievement[];
  activities: Activity[];
}

/**
 * Batch the related profile reads (profile, achievements, activities) into a
 * single parallel round-trip instead of separate, scattered requests. Combined
 * with the API client's in-flight GET coalescing, this avoids the profile page
 * firing many small sequential requests.
 */
export async function fetchProfileOverview(
  address: string
): Promise<ProfileOverview> {
  const [profile, achievements, activities] = await Promise.all([
    fetchUserProfile(address),
    fetchUserAchievements(address),
    fetchUserActivities(address),
  ]);
  return { profile, achievements, activities };
}
