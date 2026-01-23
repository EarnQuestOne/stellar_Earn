import type {
  Quest,
  QuestFormData,
  AdminStats,
  AdminUser,
  BulkOperation,
  QuestStatus,
} from '../types/admin';

// Simulated delay for mock API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data for development
const mockQuests: Quest[] = [
  {
    id: '1',
    title: 'Build Smart Contract Integration',
    description: 'Implement a Soroban smart contract integration for the reward distribution system. This includes setting up the contract calls, handling transactions, and error management.',
    shortDescription: 'Integrate Soroban smart contracts for rewards',
    category: 'Blockchain',
    difficulty: 'advanced',
    status: 'active',
    reward: 500,
    xpReward: 250,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 5,
    currentParticipants: 3,
    requirements: ['Rust experience', 'Soroban SDK knowledge', 'Previous blockchain development'],
    tags: ['soroban', 'rust', 'smart-contract'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  },
  {
    id: '2',
    title: 'Create Documentation for API Endpoints',
    description: 'Write comprehensive documentation for all REST API endpoints including authentication, quest management, and user profiles.',
    shortDescription: 'Document all API endpoints with examples',
    category: 'Documentation',
    difficulty: 'beginner',
    status: 'active',
    reward: 100,
    xpReward: 50,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 3,
    currentParticipants: 1,
    requirements: ['Technical writing skills', 'API knowledge'],
    tags: ['documentation', 'api', 'technical-writing'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  },
  {
    id: '3',
    title: 'Design User Profile Page',
    description: 'Create UI/UX designs for the user profile page including badges display, stats visualization, and activity history.',
    shortDescription: 'Design user profile UI/UX',
    category: 'Design',
    difficulty: 'intermediate',
    status: 'paused',
    reward: 200,
    xpReward: 100,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 2,
    currentParticipants: 2,
    requirements: ['Figma proficiency', 'UI/UX experience'],
    tags: ['design', 'figma', 'ui-ux'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  },
  {
    id: '4',
    title: 'Implement Unit Tests for Auth Module',
    description: 'Write comprehensive unit tests for the authentication module covering login, logout, token refresh, and permission validation.',
    shortDescription: 'Add unit tests for authentication',
    category: 'Testing',
    difficulty: 'intermediate',
    status: 'completed',
    reward: 150,
    xpReward: 75,
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 2,
    currentParticipants: 2,
    requirements: ['Jest knowledge', 'Testing experience'],
    tags: ['testing', 'jest', 'unit-tests'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  },
  {
    id: '5',
    title: 'Build Community Discord Bot',
    description: 'Create a Discord bot that posts new quest announcements, tracks user XP, and provides quest status updates.',
    shortDescription: 'Discord bot for community engagement',
    category: 'Community',
    difficulty: 'intermediate',
    status: 'draft',
    reward: 300,
    xpReward: 150,
    deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 1,
    currentParticipants: 0,
    requirements: ['Discord.js experience', 'Node.js'],
    tags: ['discord', 'bot', 'community'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  },
];

const mockAdminStats: AdminStats = {
  totalQuests: 25,
  activeQuests: 12,
  completedQuests: 8,
  totalParticipants: 156,
  totalRewardsDistributed: 15000,
  pendingSubmissions: 23,
  approvedSubmissions: 89,
  rejectedSubmissions: 12,
};

const mockAdminUser: AdminUser = {
  id: '1',
  stellarAddress: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  username: 'admin',
  role: 'super_admin',
  permissions: ['create_quest', 'edit_quest', 'delete_quest', 'manage_users', 'view_stats'],
};

// API Functions
export async function fetchAdminUser(): Promise<AdminUser> {
  await delay(300);
  return mockAdminUser;
}

export async function checkAdminAccess(): Promise<boolean> {
  await delay(200);
  // In production, this would verify the user's JWT and admin role
  return true;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  await delay(400);
  return mockAdminStats;
}

export async function fetchQuests(): Promise<Quest[]> {
  await delay(500);
  return [...mockQuests];
}

export async function fetchQuestById(id: string): Promise<Quest | null> {
  await delay(300);
  return mockQuests.find(q => q.id === id) || null;
}

export async function createQuest(data: QuestFormData): Promise<Quest> {
  await delay(600);
  const newQuest: Quest = {
    ...data,
    id: String(Date.now()),
    status: 'draft',
    currentParticipants: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
  };
  mockQuests.push(newQuest);
  return newQuest;
}

export async function updateQuest(id: string, data: Partial<QuestFormData>): Promise<Quest> {
  await delay(500);
  const index = mockQuests.findIndex(q => q.id === id);
  if (index === -1) {
    throw new Error('Quest not found');
  }
  mockQuests[index] = {
    ...mockQuests[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return mockQuests[index];
}

export async function updateQuestStatus(id: string, status: QuestStatus): Promise<Quest> {
  await delay(400);
  const index = mockQuests.findIndex(q => q.id === id);
  if (index === -1) {
    throw new Error('Quest not found');
  }
  mockQuests[index] = {
    ...mockQuests[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  return mockQuests[index];
}

export async function deleteQuest(id: string): Promise<void> {
  await delay(400);
  const index = mockQuests.findIndex(q => q.id === id);
  if (index === -1) {
    throw new Error('Quest not found');
  }
  mockQuests.splice(index, 1);
}

export async function executeBulkOperation(operation: BulkOperation): Promise<{ success: number; failed: number }> {
  await delay(800);
  let success = 0;
  let failed = 0;

  for (const questId of operation.questIds) {
    const index = mockQuests.findIndex(q => q.id === questId);
    if (index === -1) {
      failed++;
      continue;
    }

    switch (operation.action) {
      case 'activate':
        mockQuests[index].status = 'active';
        break;
      case 'pause':
        mockQuests[index].status = 'paused';
        break;
      case 'complete':
        mockQuests[index].status = 'completed';
        break;
      case 'cancel':
        mockQuests[index].status = 'cancelled';
        break;
      case 'delete':
        mockQuests.splice(index, 1);
        break;
    }
    mockQuests[index] && (mockQuests[index].updatedAt = new Date().toISOString());
    success++;
  }

  return { success, failed };
}
