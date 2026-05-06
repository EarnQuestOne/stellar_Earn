import { StateCreator } from 'zustand';
import type {
  UserProfile,
  ProfileStats,
  Achievement,
  Activity,
} from '@/lib/types/profile';

interface UserData {
  profile: UserProfile;
  stats: ProfileStats;
  achievements: Achievement[];
  activities: Activity[];
}

export interface UserSlice {
  // 🔹 state
  profile: UserProfile | null;
  stats: ProfileStats | null;
  achievements: Achievement[];
  activities: Activity[];

  isLoading: boolean;
  error: string | null;

  isUpdating: boolean;
  updateError: string | null;

  // 🔹 actions
  setUserData: (data: UserData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUpdating: (updating: boolean) => void;
  setUpdateError: (error: string | null) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set) => ({
  // ✅ initial state
  profile: null,
  stats: null,
  achievements: [],
  activities: [],

  isLoading: false,
  error: null,

  isUpdating: false,
  updateError: null,

  // ✅ actions
  setUserData: (data) =>
    set(() => ({
      profile: data.profile,
      stats: data.stats,
      achievements: data.achievements,
      activities: data.activities,
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setUpdating: (isUpdating) => set({ isUpdating }),
  setUpdateError: (updateError) => set({ updateError }),
});
