/**
 * Comprehensive API types for StellarEarn frontend ↔ backend communication.
 * All API responses, request shapes, error formats, and common pagination types live here.
 */

// ---------------------------------------------------------------------------
// Common / shared
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  cursor?: string;
  nextCursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Standard JSON envelope returned by the backend on success */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

/** Query params shared by listing endpoints */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ChallengeRequest {
  stellarAddress: string;
}

export interface ChallengeResponse {
  challenge: string;
  expiresAt: string;
}

export interface LoginRequest {
  stellarAddress: string;
  signature: string;
  publicKey: string;
  challenge: string;
}

export type LoginResponse = AuthTokens;

export interface RefreshRequest {
  refreshToken: string;
}

export type RefreshResponse = AuthTokens;

export interface AuthUserProfile {
  stellarAddress: string;
  role: 'ADMIN' | 'USER' | 'MODERATOR' | 'VERIFIER';
}

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------

export type QuestStatus = 'Active' | 'Paused' | 'Completed' | 'Expired';
export type QuestDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface QuestResponse {
  id: string;
  contractQuestId: string;
  title: string;
  description: string;
  category: string;
  difficulty?: QuestDifficulty;
  rewardAsset: string;
  rewardAmount: string | number;
  xpReward?: number;
  verifierAddress: string;
  deadline?: string | null;
  status: QuestStatus;
  totalClaims: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  maxParticipants?: number;
  currentParticipants?: number;
  requirements?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestRequest {
  title: string;
  description: string;
  category: string;
  difficulty?: QuestDifficulty;
  rewardAsset: string;
  rewardAmount: number;
  xpReward?: number;
  verifierAddress: string;
  deadline?: string;
  maxParticipants?: number;
  requirements?: string[];
  tags?: string[];
}

export interface UpdateQuestRequest extends Partial<CreateQuestRequest> {
  status?: QuestStatus;
}

export interface QuestQueryParams extends PaginationParams {
  status?: QuestStatus;
  category?: string;
  difficulty?: QuestDifficulty;
  search?: string;
  minReward?: number;
  maxReward?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedQuestsResponse {
  quests: QuestResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export type ProofType = 'link' | 'file' | 'text';

export interface ProofPayload {
  type: ProofType;
  link?: string;
  text?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileContent?: string; // base64 for small files
}

export interface CreateSubmissionRequest {
  questId: string;
  proof: ProofPayload;
  additionalNotes?: string;
}

export interface SubmissionResponse {
  id: string;
  questId: string;
  userId: string;
  status: SubmissionStatus;
  proof: Record<string, unknown>;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  createdAt: string;
  updatedAt: string;
  quest?: {
    id: string;
    title: string;
    rewardAmount: string | number;
    rewardAsset: string;
  };
  user?: {
    id: string;
    stellarAddress: string;
  };
}

export interface ApproveSubmissionRequest {
  notes?: string;
}

export interface RejectSubmissionRequest {
  reason: string;
}

export interface UploadProofResponse {
  fileUrl: string;
  fileId: string;
}

// ---------------------------------------------------------------------------
// User / Profile
// ---------------------------------------------------------------------------

export interface UserResponse {
  id: string;
  stellarAddress: string | null;
  username: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'MODERATOR' | 'VERIFIER';
  xp: number;
  level: number;
  questsCompleted: number;
  badges: string[];
  avatarUrl?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
  };
  successRate: number;
  totalEarned: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatsResponse {
  xp: number;
  level: number;
  questsCompleted: number;
  failedQuests: number;
  successRate: number;
  totalEarned: string;
  badges: string[];
  lastActiveAt?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    github?: string;
    discord?: string;
    website?: string;
  };
}

export interface UserSearchParams extends PaginationParams {
  query?: string;
  sortBy?: 'xp' | 'level' | 'createdAt';
  order?: 'ASC' | 'DESC';
}

export interface LeaderboardEntry {
  rank: number;
  user: UserResponse;
}

// ---------------------------------------------------------------------------
// Payout
// ---------------------------------------------------------------------------

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retry_scheduled';
export type PayoutType = 'quest_reward' | 'bonus' | 'referral';

export interface PayoutResponse {
  id: string;
  stellarAddress: string;
  amount: number;
  asset: string;
  status: PayoutStatus;
  type: PayoutType;
  questId: string | null;
  submissionId: string | null;
  transactionHash: string | null;
  stellarLedger: number | null;
  failureReason: string | null;
  retryCount: number;
  processedAt: string | null;
  claimedAt: string | null;
  createdAt: string;
}

export interface ClaimPayoutRequest {
  submissionId: string;
  stellarAddress: string;
}

export interface PayoutHistoryResponse {
  payouts: PayoutResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PayoutStatsResponse {
  totalPayouts: number;
  totalAmount: number;
  pendingPayouts: number;
  pendingAmount: number;
  completedPayouts: number;
  completedAmount: number;
  failedPayouts: number;
}

export interface PayoutQueryParams extends PaginationParams {
  status?: PayoutStatus;
  type?: PayoutType;
  stellarAddress?: string;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory =
  | 'quest_update'
  | 'submission_status'
  | 'reward_claim'
  | 'system';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationResponse[];
  total: number;
  unreadCount: number;
}

export interface NotificationQueryParams extends PaginationParams {
  read?: boolean;
  category?: NotificationCategory;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchResultItem {
  id: string;
  type: 'quest' | 'user' | 'submission';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResultItem[];
  suggestions: string[];
  total: number;
}

export interface SearchParams {
  q: string;
  type?: 'quest' | 'user' | 'submission' | 'all';
  limit?: number;
}
