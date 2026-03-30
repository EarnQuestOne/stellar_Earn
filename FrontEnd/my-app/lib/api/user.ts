/**
 * User / Profile API – via the centralised Axios client.
 *
 * Endpoints (all under /api/v1/users):
 *  GET    /search              – search users
 *  GET    /leaderboard         – leaderboard
 *  GET    /:address            – user by Stellar address
 *  GET    /:address/stats      – user statistics
 *  GET    /:address/quests     – user quest history (paginated)
 *  PATCH  /profile             – update own profile (auth required)
 *  DELETE /:address            – delete own account (auth required)
 *
 * Dashboard helpers still available (fetchDashboardData etc.)
 */

import {
  get,
  patch,
  del,
  withRetry,
  createCancelToken,
  type CancelToken,
} from "./client";
import type {
  UserResponse,
  UserStatsResponse,
  UpdateProfileRequest,
  UserSearchParams,
  PaginationParams,
} from "@/lib/types/api.types";

// Re-export legacy dashboard types for backward compat
export type {
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
  DashboardData,
} from "../types/dashboard";
import type {
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
  DashboardData,
} from "../types/dashboard";

const dashboardDelay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const mockUserStats: UserStats = {
  xp: 2840,
  level: 12,
  totalEarnings: 2450,
  questsCompleted: 42,
  currentStreak: 6,
};

const mockActiveQuests: Quest[] = [
  {
    id: "active-1",
    title: "Smart Contract Security Review",
    description:
      "Audit reward distribution contract flow and document findings.",
    reward: 250,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 72,
    status: "active",
    category: "Blockchain",
  },
  {
    id: "active-2",
    title: "Documentation Update",
    description: "Refresh contributor docs and integration notes.",
    reward: 75,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 34,
    status: "active",
    category: "Documentation",
  },
  {
    id: "active-3",
    title: "UI Component Library",
    description: "Extend reusable quest card and moderation components.",
    reward: 150,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 58,
    status: "active",
    category: "Development",
  },
];

const mockRecentSubmissions: Submission[] = [
  {
    id: "submission-1",
    questId: "active-1",
    questTitle: "Smart Contract Security Review",
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "approved",
    reward: 250,
    feedback: "Approved after final validation pass.",
  },
  {
    id: "submission-2",
    questId: "active-2",
    questTitle: "Documentation Update",
    submittedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    status: "pending",
    reward: 75,
  },
  {
    id: "submission-3",
    questId: "archive-1",
    questTitle: "API Error Handling Improvements",
    submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "rejected",
    reward: 125,
    feedback: "Missing required test coverage.",
  },
];

const mockEarningsHistory: EarningsData[] = [
  { date: "2026-03-01", amount: 120 },
  { date: "2026-03-08", amount: 300 },
  { date: "2026-03-15", amount: 180 },
  { date: "2026-03-22", amount: 450 },
];

const mockBadges: Badge[] = [
  {
    id: "badge-1",
    name: "Fast Finisher",
    description: "Completed 10 quests before deadline.",
    icon: "bolt",
    earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    rarity: "rare",
  },
  {
    id: "badge-2",
    name: "Code Guardian",
    description: "Delivered multiple high-quality review submissions.",
    icon: "shield",
    earnedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    rarity: "epic",
  },
];

// ---------------------------------------------------------------------------
// Fetch user by Stellar address
// ---------------------------------------------------------------------------

export async function fetchUserByAddress(
  address: string,
  cancelToken?: CancelToken,
): Promise<UserResponse> {
  return withRetry(() =>
    get<UserResponse>(`/users/${address}`, {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// User stats
// ---------------------------------------------------------------------------

export async function fetchUserStats(
  address: string,
  cancelToken?: CancelToken,
): Promise<UserStatsResponse> {
  return withRetry(() =>
    get<UserStatsResponse>(`/users/${address}/stats`, {
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// User quest history
// ---------------------------------------------------------------------------

export async function fetchUserQuests(
  address: string,
  page = 1,
  limit = 20,
  cancelToken?: CancelToken,
): Promise<{ quests: unknown[]; total: number; page: number; limit: number }> {
  return withRetry(() =>
    get<{ quests: unknown[]; total: number; page: number; limit: number }>(
      `/users/${address}/quests`,
      {
        params: { page, limit },
        signal: cancelToken?.signal,
      },
    ),
  );
}

// ---------------------------------------------------------------------------
// Update own profile (authenticated)
// ---------------------------------------------------------------------------

export async function updateProfile(
  payload: UpdateProfileRequest,
): Promise<UserResponse> {
  return patch<UserResponse>("/users/profile", payload);
}

// ---------------------------------------------------------------------------
// Search users
// ---------------------------------------------------------------------------

export async function searchUsers(
  params: UserSearchParams,
  cancelToken?: CancelToken,
): Promise<{ users: UserResponse[]; total: number }> {
  return withRetry(() =>
    get<{ users: UserResponse[]; total: number }>("/users/search", {
      params: params as Record<string, unknown>,
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export async function fetchLeaderboard(
  page = 1,
  limit = 50,
  cancelToken?: CancelToken,
): Promise<{ users: UserResponse[]; total: number }> {
  return withRetry(() =>
    get<{ users: UserResponse[]; total: number }>("/users/leaderboard", {
      params: { page, limit },
      signal: cancelToken?.signal,
    }),
  );
}

// ---------------------------------------------------------------------------
// Delete own account
// ---------------------------------------------------------------------------

export async function deleteAccount(address: string): Promise<void> {
  return del<void>(`/users/${address}`);
}

// ---------------------------------------------------------------------------
// Legacy dashboard helpers (backward compatibility for existing UI)
// ---------------------------------------------------------------------------

export async function fetchActiveQuests(): Promise<Quest[]> {
  await dashboardDelay(250);
  return [...mockActiveQuests];
}

export async function fetchRecentSubmissions(): Promise<Submission[]> {
  await dashboardDelay(250);
  return [...mockRecentSubmissions];
}

export async function fetchEarningsHistory(): Promise<EarningsData[]> {
  await dashboardDelay(250);
  return [...mockEarningsHistory];
}

export async function fetchBadges(): Promise<Badge[]> {
  await dashboardDelay(250);
  return [...mockBadges];
}

// ---------------------------------------------------------------------------
// Dashboard aggregate (convenience)
// ---------------------------------------------------------------------------

/**
 * Fetch all dashboard data in parallel for the given Stellar address.
 */
export async function fetchDashboardData(
  address?: string,
): Promise<
  DashboardData | { userProfile: UserResponse; userStats: UserStatsResponse }
> {
  if (address) {
    const [userProfile, userStats] = await Promise.all([
      fetchUserByAddress(address),
      fetchUserStats(address),
    ]);
    return { userProfile, userStats };
  }

  const [activeQuests, recentSubmissions, earningsHistory, badges] =
    await Promise.all([
      fetchActiveQuests(),
      fetchRecentSubmissions(),
      fetchEarningsHistory(),
      fetchBadges(),
    ]);

  return {
    stats: mockUserStats,
    activeQuests,
    recentSubmissions,
    earningsHistory,
    badges,
  };
}

// ---------------------------------------------------------------------------
// Profile page (legacy shape – profile + achievements + activities)
// ---------------------------------------------------------------------------

export async function fetchUserProfile(address: string) {
  return fetchUserByAddress(address);
}

export async function updateUserProfile(
  _address: string,
  data: UpdateProfileRequest,
) {
  return updateProfile(data);
}
