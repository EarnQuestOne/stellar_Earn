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
