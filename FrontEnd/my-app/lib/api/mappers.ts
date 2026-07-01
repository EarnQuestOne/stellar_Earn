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
 * Maps a raw QuestResponse (DTO) to the UI Quest domain model.
 * Normalizes enums and provides defaults for optional/nullable fields.
 */
export function mapQuest(dto: any): Quest {
  if (!dto) {
    throw new Error('mapQuest: dto is null or undefined');
  }

  // Handle nested data wrappers if they exist in legacy code/tests
  const raw = dto.data && typeof dto.data === 'object' && !Array.isArray(dto.data) ? dto.data : dto;

  // Status mapping and normalization
  let status: QuestStatus = QuestStatus.ACTIVE;
  if (raw.status) {
    const s = String(raw.status).trim();
    const normalized = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (Object.values(QuestStatus).includes(normalized as any)) {
      status = normalized as QuestStatus;
    }
  }

  // Difficulty mapping and normalization
  let difficulty: QuestDifficulty | undefined = undefined;
  if (raw.difficulty) {
    const d = String(raw.difficulty).trim().toLowerCase();
    if (Object.values(QuestDifficulty).includes(d as any)) {
      difficulty = d as QuestDifficulty;
    }
  }

  return {
    id: raw.id || '',
    contractQuestId: raw.contractQuestId || '',
    title: raw.title || '',
    description: raw.description || '',
    category: raw.category || '',
    rewardAsset: raw.rewardAsset || '',
    rewardAmount: raw.rewardAmount !== undefined ? raw.rewardAmount : '0',
    xpReward: raw.xpReward,
    verifierAddress: raw.verifierAddress || '',
    deadline: raw.deadline,
    status,
    difficulty,
    totalClaims: raw.totalClaims || 0,
    totalSubmissions: raw.totalSubmissions || 0,
    approvedSubmissions: raw.approvedSubmissions || 0,
    rejectedSubmissions: raw.rejectedSubmissions || 0,
    maxParticipants: raw.maxParticipants,
    currentParticipants: raw.currentParticipants,
    requirements: raw.requirements || [],
    tags: raw.tags || [],
    creator: raw.creator,
    skills: raw.skills || [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps a raw PaginatedQuestsResponse to the UI PaginatedResponse<Quest> model.
 */
export function mapPaginatedQuests(dto: any): PaginatedResponse<Quest> {
  if (!dto) {
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    };
  }

  // Support both backend format (`quests`) and legacy mock server format (`data`)
  const questsRaw = dto.quests || dto.data || [];
  const data = Array.isArray(questsRaw) ? questsRaw.map(mapQuest) : [];

  const meta = dto.meta || {};
  const page = dto.page ?? meta.page ?? 1;
  const limit = dto.limit ?? meta.limit ?? 12;
  const total = dto.total ?? meta.total ?? data.length;
  const totalPages = dto.totalPages ?? meta.totalPages ?? Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
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
