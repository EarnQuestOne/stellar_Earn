/**
 * User dashboard data types.
 *
 * These interfaces define the shape of the payload returned by the
 * dashboard aggregate endpoint. They are intentionally kept in the
 * `lib/api/user` module so consumers can import them from a single
 * path: `@/lib/api/user`.
 *
 * The canonical source definitions live in `@/lib/types/dashboard`
 * and `@/lib/types/api.types`. This file re-exports them with a
 * stable public surface that the rest of the application relies on.
 */

import type {
  QuestResponse,
  SubmissionResponse,
  UserStatsResponse,
} from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// Alias types (convenience re-maps of backend response shapes)
// ---------------------------------------------------------------------------

/** User statistics – mirrors the backend `UserStatsResponse`. */
export type UserStats = UserStatsResponse;

/** A quest item – mirrors the backend `QuestResponse`. */
export type Quest = QuestResponse;

/** A submission entry – mirrors the backend `SubmissionResponse`. */
export type Submission = SubmissionResponse;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/** A single earnings data-point used by the earnings chart. */
export interface EarningsData {
  date: string;
  amount: number;
}

/** A badge earned by the user. */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ---------------------------------------------------------------------------
// Dashboard aggregate
// ---------------------------------------------------------------------------

/**
 * Complete payload returned by `fetchDashboardData()` when called
 * without an explicit Stellar address (i.e. mock / legacy mode).
 */
export interface DashboardData {
  stats: UserStats;
  activeQuests: Quest[];
  recentSubmissions: Submission[];
  earningsHistory: EarningsData[];
  badges: Badge[];
}
