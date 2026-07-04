import { describe, it, expect, expectTypeOf } from 'vitest';

import type {
  UserStats,
  Quest,
  Submission,
  EarningsData,
  Badge,
  DashboardData,
} from '@/lib/api/user';

import { fetchDashboardData } from '@/lib/api/user';

describe('lib/api/user – DashboardData type exports', () => {
  it('exports DashboardData as a type-only interface', () => {
    // DashboardData must be structurally valid as a type.
    const stub: DashboardData = {
      stats: {
        xp: 0,
        level: 1,
        questsCompleted: 0,
        failedQuests: 0,
        successRate: 0,
        totalEarned: '0',
        badges: [],
      },
      activeQuests: [],
      recentSubmissions: [],
      earningsHistory: [],
      badges: [],
    };

    expect(stub).toBeDefined();
    expect(stub.stats).toBeDefined();
    expect(Array.isArray(stub.activeQuests)).toBe(true);
    expect(Array.isArray(stub.recentSubmissions)).toBe(true);
    expect(Array.isArray(stub.earningsHistory)).toBe(true);
    expect(Array.isArray(stub.badges)).toBe(true);
  });

  it('exports EarningsData interface', () => {
    const data: EarningsData = { date: '2026-01-01', amount: 100 };
    expect(data.date).toBe('2026-01-01');
    expect(data.amount).toBe(100);
  });

  it('exports Badge interface with valid rarity', () => {
    const badge: Badge = {
      id: 'b1',
      name: 'Test',
      description: 'A test badge',
      icon: 'star',
      earnedAt: new Date().toISOString(),
      rarity: 'rare',
    };

    expect(badge.rarity).toBe('rare');
  });

  it('UserStats is assignable from UserStatsResponse shape', () => {
    const stats: UserStats = {
      xp: 100,
      level: 5,
      questsCompleted: 10,
      failedQuests: 1,
      successRate: 90,
      totalEarned: '500',
      badges: ['b1'],
    };

    expect(stats.xp).toBe(100);
  });

  it('exports fetchDashboardData as a function', () => {
    expect(typeof fetchDashboardData).toBe('function');
  });

  it('DashboardData satisfies expected structural shape', () => {
    expectTypeOf<DashboardData>().toHaveProperty('stats');
    expectTypeOf<DashboardData>().toHaveProperty('activeQuests');
    expectTypeOf<DashboardData>().toHaveProperty('recentSubmissions');
    expectTypeOf<DashboardData>().toHaveProperty('earningsHistory');
    expectTypeOf<DashboardData>().toHaveProperty('badges');
  });

  it('Quest type alias is usable', () => {
    expectTypeOf<Quest>().toHaveProperty('id');
    expectTypeOf<Quest>().toHaveProperty('title');
    expectTypeOf<Quest>().toHaveProperty('status');
  });

  it('Submission type alias is usable', () => {
    expectTypeOf<Submission>().toHaveProperty('id');
    expectTypeOf<Submission>().toHaveProperty('questId');
    expectTypeOf<Submission>().toHaveProperty('status');
  });
});
