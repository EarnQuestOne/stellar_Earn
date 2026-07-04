/**
 * lib/api/user – public barrel.
 *
 * Re-exports every public symbol so the rest of the application can
 * import from a single path:
 *
 *   import { fetchDashboardData, type DashboardData } from '@/lib/api/user';
 */

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
  DashboardData,
} from './types';

// ── API functions & legacy type re-exports ─────────────────────────────────
export {
  fetchUserByAddress,
  fetchUserStats,
  fetchUserQuests,
  updateProfile,
  searchUsers,
  fetchLeaderboard,
  deleteAccount,
  fetchActiveQuests,
  fetchRecentSubmissions,
  fetchEarningsHistory,
  fetchBadges,
  fetchDashboardData,
  fetchUserProfile,
  updateUserProfile,
} from './user-api';
