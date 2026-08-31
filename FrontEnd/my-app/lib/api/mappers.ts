import type {
  QuestResponse,
  PaginatedQuestsResponse,
  UserResponse,
  UserStatsResponse,
  SubmissionResponse,
} from '@/lib/types/api.types';
import {
  QuestStatus,
  QuestDifficulty,
  type Quest,
  type PaginatedResponse,
} from '@/lib/types/quest';
import type {
  UserProfile,
} from '@/lib/types/profile';
import type {
  Submission,
  ApiSubmissionStatus,
} from '@/lib/types/submission';
import type {
  Badge,
} from '@/lib/types/dashboard';

/**
 * Maps a QuestResponse (API DTO) to the UI Quest domain model.
 * This is the single source of truth for converting API data to UI models.
 * All API-to-UI transformations should go through this mapper.
 */
export function mapQuest(dto: QuestResponse): Quest {
  // Status mapping: normalize API status to UI QuestStatus enum
  let status: QuestStatus = QuestStatus.ACTIVE;
  if (dto.status) {
    const s = String(dto.status).trim();
    const normalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (Object.values(QuestStatus).includes(normalized as any)) {
      status = normalized as QuestStatus;
    }
  }

  // Difficulty mapping: normalize API difficulty to UI QuestDifficulty enum
  let difficulty: QuestDifficulty | undefined = undefined;
  if (dto.difficulty) {
    const d = String(dto.difficulty).trim().toLowerCase();
    if (Object.values(QuestDifficulty).includes(d as any)) {
      difficulty = d as QuestDifficulty;
    }
  }

  return {
    id: dto.id,
    contractQuestId: dto.contractQuestId,
    title: dto.title,
    description: dto.description,
    category: dto.category,
    difficulty,
    rewardAsset: dto.rewardAsset,
    rewardAmount: dto.rewardAmount,
    xpReward: dto.xpReward,
    verifierAddress: dto.verifierAddress,
    deadline: dto.deadline,
    status,
    totalClaims: dto.totalClaims,
    totalSubmissions: dto.totalSubmissions,
    approvedSubmissions: dto.approvedSubmissions,
    rejectedSubmissions: dto.rejectedSubmissions,
    maxParticipants: dto.maxParticipants,
    currentParticipants: dto.currentParticipants,
    requirements: dto.requirements || [],
    tags: dto.tags || [],
    creator: dto.creator,
    skills: dto.skills || [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/**
 * Maps a PaginatedQuestsResponse (API DTO) to the UI PaginatedResponse<Quest> model.
 * This is the single source of truth for converting paginated API data to UI models.
 */
export function mapPaginatedQuests(dto: PaginatedQuestsResponse): PaginatedResponse<Quest> {
  const data = dto.quests.map(mapQuest);

  return {
    data,
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
    totalPages: dto.totalPages,
  };
}

/**
 * Maps a raw UserResponse to a UI UserProfile domain model.
 */
export function mapUserProfile(
  dto: UserResponse,
  isOwnProfile = false,
  isFollowing = false
): UserProfile {
  return {
    id: dto.id || '',
    username: dto.username || '',
    stellarAddress: dto.stellarAddress || '',
    avatar: dto.avatarUrl || '',
    bio: dto.bio || '',
    level: dto.level || 1,
    xp: dto.xp || 0,
    totalEarnings: parseFloat(dto.totalEarned || '0'),
    questsCompleted: dto.questsCompleted || 0,
    currentStreak: 0, // default, not in UserResponse
    joinDate: dto.createdAt || new Date().toISOString(),
    lastActive: dto.lastActiveAt || dto.updatedAt || new Date().toISOString(),
    isFollowing: isOwnProfile ? false : isFollowing,
    followersCount: 0, // default
    followingCount: 0, // default
    isOwnProfile,
  };
}

/**
 * Maps a raw UserStatsResponse to a UI UserStats domain model.
 */
export function mapUserStats(dto: UserStatsResponse): UserStatsResponse {
  return {
    xp: dto.xp || 0,
    level: dto.level || 1,
    totalEarned: String(dto.totalEarned || '0'),
    questsCompleted: dto.questsCompleted || 0,
    failedQuests: dto.failedQuests || 0,
    successRate: dto.successRate || 0,
    badges: dto.badges || [],
    lastActiveAt: dto.lastActiveAt,
  };
}

/**
 * Maps a raw SubmissionResponse to a UI Submission domain model.
 */
export function mapSubmission(dto: SubmissionResponse): Submission {
  return {
    id: dto.id || '',
    questId: dto.questId || '',
    userId: dto.userId || '',
    status: dto.status as ApiSubmissionStatus,
    proof: dto.proof || {},
    rejectionReason: dto.rejectionReason,
    approvedAt: dto.approvedAt,
    approvedBy: dto.approvedBy,
    rejectedAt: dto.rejectedAt,
    rejectedBy: dto.rejectedBy,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    quest: dto.quest ? {
      id: dto.quest.id,
      title: dto.quest.title,
      rewardAmount: dto.quest.rewardAmount,
      rewardAsset: dto.quest.rewardAsset,
    } : undefined,
  };
}

/**
 * Helper to map a Badge ID or registry entry to a full Badge.
 */
export function mapBadgeIdToBadge(id: string): Badge {
  const registry: Record<string, Omit<Badge, 'id' | 'earnedAt'>> = {
    'badge-1': {
      name: 'Fast Finisher',
      description: 'Completed 10 quests before deadline.',
      icon: 'bolt',
      rarity: 'rare',
    },
    'badge-2': {
      name: 'Code Guardian',
      description: 'Delivered multiple high-quality review submissions.',
      icon: 'shield',
      rarity: 'epic',
    },
  };

  const registered = registry[id] || {
    name: id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    description: 'Earned achievement badge.',
    icon: 'award',
    rarity: 'common',
  };

  return {
    id,
    ...registered,
    earnedAt: new Date().toISOString(),
  };
}
