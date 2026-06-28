/**
 * Contract / API fixture tests for quest serialization from backend response.
 *
 * These tests pin the exact shape and types the frontend expects from the
 * backend.  Each fixture file represents a realistic backend payload; the
 * tests assert field presence, types, allowed enum values, and correct
 * handling of optional / nullable fields.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { getQuests, getQuestById } from './quests';
import { cacheManager } from '@/lib/utils/cache';

import questFullFixture from './__fixtures__/quest-full.json';
import questMinimalFixture from './__fixtures__/quest-minimal.json';
import questNullOptionalsFixture from './__fixtures__/quest-null-optionals.json';
import questPaginatedFixture from './__fixtures__/quest-paginated-response.json';
import questPaginatedEmptyFixture from './__fixtures__/quest-paginated-empty.json';

import type {
  QuestResponse,
  QuestStatus,
  QuestDifficulty,
  PaginatedQuestsResponse,
} from '@/lib/types/api.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_STATUSES: QuestStatus[] = [
  'Active',
  'Paused',
  'Completed',
  'Expired',
];
const VALID_DIFFICULTIES: QuestDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

function assertRequiredQuestFields(quest: QuestResponse): void {
  expect(typeof quest.id).toBe('string');
  expect(quest.id.length).toBeGreaterThan(0);

  expect(typeof quest.contractQuestId).toBe('string');
  expect(quest.contractQuestId.length).toBeGreaterThan(0);

  expect(typeof quest.title).toBe('string');
  expect(quest.title.length).toBeGreaterThan(0);

  expect(typeof quest.description).toBe('string');
  expect(quest.description.length).toBeGreaterThan(0);

  expect(typeof quest.category).toBe('string');
  expect(quest.category.length).toBeGreaterThan(0);

  expect(typeof quest.rewardAsset).toBe('string');
  expect(quest.rewardAsset.length).toBeGreaterThan(0);

  expect(['string', 'number']).toContain(typeof quest.rewardAmount);

  expect(typeof quest.verifierAddress).toBe('string');
  expect(quest.verifierAddress.length).toBeGreaterThan(0);

  expect(VALID_STATUSES).toContain(quest.status);

  expect(typeof quest.totalClaims).toBe('number');
  expect(quest.totalClaims).toBeGreaterThanOrEqual(0);

  expect(typeof quest.totalSubmissions).toBe('number');
  expect(quest.totalSubmissions).toBeGreaterThanOrEqual(0);

  expect(typeof quest.approvedSubmissions).toBe('number');
  expect(quest.approvedSubmissions).toBeGreaterThanOrEqual(0);

  expect(typeof quest.rejectedSubmissions).toBe('number');
  expect(quest.rejectedSubmissions).toBeGreaterThanOrEqual(0);

  expect(typeof quest.createdAt).toBe('string');
  expect(ISO_DATE_RE.test(quest.createdAt)).toBe(true);

  expect(typeof quest.updatedAt).toBe('string');
  expect(ISO_DATE_RE.test(quest.updatedAt)).toBe(true);
}

// ---------------------------------------------------------------------------
// Unit: fixture shape assertions (no network)
// ---------------------------------------------------------------------------

describe('QuestResponse – required field types (fixture: quest-full)', () => {
  const quest = questFullFixture as QuestResponse;

  it('has a non-empty string id', () => {
    expect(typeof quest.id).toBe('string');
    expect(quest.id.length).toBeGreaterThan(0);
  });

  it('has a non-empty string contractQuestId', () => {
    expect(typeof quest.contractQuestId).toBe('string');
    expect(quest.contractQuestId.length).toBeGreaterThan(0);
  });

  it('has a non-empty string title', () => {
    expect(typeof quest.title).toBe('string');
    expect(quest.title.length).toBeGreaterThan(0);
  });

  it('has a non-empty string description', () => {
    expect(typeof quest.description).toBe('string');
    expect(quest.description.length).toBeGreaterThan(0);
  });

  it('has a non-empty string category', () => {
    expect(typeof quest.category).toBe('string');
    expect(quest.category.length).toBeGreaterThan(0);
  });

  it('has rewardAmount as string or number', () => {
    expect(['string', 'number']).toContain(typeof quest.rewardAmount);
  });

  it('has a non-empty string rewardAsset', () => {
    expect(typeof quest.rewardAsset).toBe('string');
    expect(quest.rewardAsset.length).toBeGreaterThan(0);
  });

  it('has a valid status enum value', () => {
    expect(VALID_STATUSES).toContain(quest.status);
  });

  it('has numeric counter fields that are >= 0', () => {
    expect(typeof quest.totalClaims).toBe('number');
    expect(typeof quest.totalSubmissions).toBe('number');
    expect(typeof quest.approvedSubmissions).toBe('number');
    expect(typeof quest.rejectedSubmissions).toBe('number');
    expect(quest.totalClaims).toBeGreaterThanOrEqual(0);
    expect(quest.totalSubmissions).toBeGreaterThanOrEqual(0);
    expect(quest.approvedSubmissions).toBeGreaterThanOrEqual(0);
    expect(quest.rejectedSubmissions).toBeGreaterThanOrEqual(0);
  });

  it('has ISO-8601 createdAt and updatedAt timestamps', () => {
    expect(ISO_DATE_RE.test(quest.createdAt)).toBe(true);
    expect(ISO_DATE_RE.test(quest.updatedAt)).toBe(true);
  });
});

describe('QuestResponse – optional fields (fixture: quest-full)', () => {
  const quest = questFullFixture as QuestResponse;

  it('difficulty is a valid enum value when present', () => {
    if (quest.difficulty !== undefined && quest.difficulty !== null) {
      expect(VALID_DIFFICULTIES).toContain(quest.difficulty);
    }
  });

  it('xpReward is a non-negative number when present', () => {
    if (quest.xpReward !== undefined && quest.xpReward !== null) {
      expect(typeof quest.xpReward).toBe('number');
      expect(quest.xpReward).toBeGreaterThanOrEqual(0);
    }
  });

  it('deadline is null or an ISO-8601 string when present', () => {
    if (quest.deadline !== undefined && quest.deadline !== null) {
      expect(ISO_DATE_RE.test(quest.deadline)).toBe(true);
    }
  });

  it('requirements is null or an array of strings', () => {
    if (quest.requirements !== undefined && quest.requirements !== null) {
      expect(Array.isArray(quest.requirements)).toBe(true);
      quest.requirements.forEach((r) => expect(typeof r).toBe('string'));
    }
  });

  it('tags is null or an array of strings', () => {
    if (quest.tags !== undefined && quest.tags !== null) {
      expect(Array.isArray(quest.tags)).toBe(true);
      quest.tags.forEach((t) => expect(typeof t).toBe('string'));
    }
  });

  it('skills is null or an array of strings', () => {
    if (quest.skills !== undefined && quest.skills !== null) {
      expect(Array.isArray(quest.skills)).toBe(true);
      quest.skills.forEach((s) => expect(typeof s).toBe('string'));
    }
  });

  it('creator has id and name strings when present', () => {
    if (quest.creator !== undefined && quest.creator !== null) {
      expect(typeof quest.creator.id).toBe('string');
      expect(typeof quest.creator.name).toBe('string');
      if (quest.creator.avatarUrl !== undefined) {
        expect(typeof quest.creator.avatarUrl).toBe('string');
      }
    }
  });

  it('maxParticipants is a positive number when present', () => {
    if (quest.maxParticipants !== undefined && quest.maxParticipants !== null) {
      expect(typeof quest.maxParticipants).toBe('number');
      expect(quest.maxParticipants).toBeGreaterThan(0);
    }
  });

  it('currentParticipants is a non-negative number when present', () => {
    if (
      quest.currentParticipants !== undefined &&
      quest.currentParticipants !== null
    ) {
      expect(typeof quest.currentParticipants).toBe('number');
      expect(quest.currentParticipants).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('QuestResponse – minimal fixture (only required fields)', () => {
  const quest = questMinimalFixture as QuestResponse;

  it('passes all required field assertions', () => {
    assertRequiredQuestFields(quest);
  });

  it('handles absent optional fields without error', () => {
    expect(quest.difficulty === undefined || quest.difficulty === null).toBe(
      true
    );
    expect(quest.xpReward === undefined || quest.xpReward === null).toBe(true);
    expect(quest.deadline === undefined || quest.deadline === null).toBe(true);
    expect(
      quest.requirements === undefined || quest.requirements === null
    ).toBe(true);
    expect(quest.tags === undefined || quest.tags === null).toBe(true);
    expect(quest.skills === undefined || quest.skills === null).toBe(true);
    expect(quest.creator === undefined || quest.creator === null).toBe(true);
    expect(
      quest.maxParticipants === undefined || quest.maxParticipants === null
    ).toBe(true);
    expect(
      quest.currentParticipants === undefined ||
        quest.currentParticipants === null
    ).toBe(true);
  });

  it('rewardAmount can be a number type', () => {
    expect(typeof quest.rewardAmount).toBe('number');
  });
});

describe('QuestResponse – null optional fields fixture', () => {
  const quest = questNullOptionalsFixture as unknown as QuestResponse;

  it('passes all required field assertions', () => {
    assertRequiredQuestFields(quest);
  });

  it('accepts null deadline', () => {
    expect(quest.deadline).toBeNull();
  });

  it('accepts null difficulty', () => {
    expect(quest.difficulty == null).toBe(true);
  });

  it('accepts null xpReward', () => {
    expect(quest.xpReward == null).toBe(true);
  });

  it('accepts null requirements', () => {
    expect(quest.requirements == null).toBe(true);
  });

  it('accepts null tags', () => {
    expect(quest.tags == null).toBe(true);
  });

  it('accepts null skills', () => {
    expect(quest.skills == null).toBe(true);
  });

  it('accepts null creator', () => {
    expect(quest.creator == null).toBe(true);
  });

  it('accepts null maxParticipants', () => {
    expect(quest.maxParticipants == null).toBe(true);
  });

  it('accepts null currentParticipants', () => {
    expect(quest.currentParticipants == null).toBe(true);
  });

  it('rewardAmount as string is accepted', () => {
    expect(typeof quest.rewardAmount).toBe('string');
  });
});

describe('PaginatedQuestsResponse – paginated fixture', () => {
  const response = questPaginatedFixture as PaginatedQuestsResponse;

  it('has a quests array', () => {
    expect(Array.isArray(response.quests)).toBe(true);
  });

  it('has numeric pagination fields', () => {
    expect(typeof response.total).toBe('number');
    expect(typeof response.page).toBe('number');
    expect(typeof response.limit).toBe('number');
    expect(typeof response.totalPages).toBe('number');
  });

  it('total matches the quests array length for this fixture', () => {
    expect(response.quests).toHaveLength(response.total);
  });

  it('page is a positive integer', () => {
    expect(response.page).toBeGreaterThan(0);
    expect(Number.isInteger(response.page)).toBe(true);
  });

  it('limit is a positive integer', () => {
    expect(response.limit).toBeGreaterThan(0);
    expect(Number.isInteger(response.limit)).toBe(true);
  });

  it('every quest in the list passes required field assertions', () => {
    response.quests.forEach((quest) => {
      assertRequiredQuestFields(quest);
    });
  });

  it('every quest has a unique id', () => {
    const ids = response.quests.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('quests can have mixed rewardAmount types (string and number)', () => {
    const types = response.quests.map((q) => typeof q.rewardAmount);
    types.forEach((t) => expect(['string', 'number']).toContain(t));
  });

  it('quests with a Paused status are valid', () => {
    const pausedQuests = response.quests.filter((q) => q.status === 'Paused');
    expect(pausedQuests.length).toBeGreaterThan(0);
    pausedQuests.forEach((q) => assertRequiredQuestFields(q));
  });
});

describe('PaginatedQuestsResponse – empty list fixture', () => {
  const response = questPaginatedEmptyFixture as PaginatedQuestsResponse;

  it('has an empty quests array', () => {
    expect(response.quests).toHaveLength(0);
  });

  it('total is zero', () => {
    expect(response.total).toBe(0);
  });

  it('totalPages is zero', () => {
    expect(response.totalPages).toBe(0);
  });

  it('still has valid page and limit fields', () => {
    expect(response.page).toBeGreaterThan(0);
    expect(response.limit).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: API functions via MSW
// ---------------------------------------------------------------------------

describe('getQuestById – integration via MSW fixture', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('deserializes a full quest response correctly', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests/:id`, () =>
        HttpResponse.json(questFullFixture)
      )
    );

    const result = await getQuestById(questFullFixture.id);

    expect(result.id).toBe(questFullFixture.id);
    expect(result.contractQuestId).toBe(questFullFixture.contractQuestId);
    expect(result.title).toBe(questFullFixture.title);
    expect(result.description).toBe(questFullFixture.description);
    expect(result.category).toBe(questFullFixture.category);
    expect(result.rewardAmount).toBe(questFullFixture.rewardAmount);
    expect(result.rewardAsset).toBe(questFullFixture.rewardAsset);
    expect(result.status).toBe(questFullFixture.status);
    expect(VALID_STATUSES).toContain(result.status);
  });

  it('deserializes a minimal quest response without throwing', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests/:id`, () =>
        HttpResponse.json(questMinimalFixture)
      )
    );

    const result = await getQuestById(questMinimalFixture.id);

    assertRequiredQuestFields(result);
    expect(result.id).toBe(questMinimalFixture.id);
    expect(result.title).toBe(questMinimalFixture.title);
  });

  it('deserializes a quest with null optional fields without throwing', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests/:id`, () =>
        HttpResponse.json(questNullOptionalsFixture)
      )
    );

    const result = await getQuestById(questNullOptionalsFixture.id);

    assertRequiredQuestFields(result);
    expect(result.deadline).toBeNull();
    expect(result.difficulty == null).toBe(true);
    expect(result.creator == null).toBe(true);
  });

  it('preserves rewardAmount as a string when backend sends a string', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests/:id`, () =>
        HttpResponse.json({ ...questFullFixture, rewardAmount: '750' })
      )
    );

    const result = await getQuestById(questFullFixture.id);
    expect(result.rewardAmount).toBe('750');
    expect(typeof result.rewardAmount).toBe('string');
  });

  it('preserves rewardAmount as a number when backend sends a number', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests/:id`, () =>
        HttpResponse.json({ ...questMinimalFixture, rewardAmount: 200 })
      )
    );

    const result = await getQuestById(questMinimalFixture.id);
    expect(result.rewardAmount).toBe(200);
    expect(typeof result.rewardAmount).toBe('number');
  });

  it('handles each valid status value from the backend', async () => {
    for (const status of VALID_STATUSES) {
      cacheManager.clear();
      server.use(
        http.get(`${API_BASE}/api/v1/quests/:id`, () =>
          HttpResponse.json({ ...questFullFixture, status })
        )
      );

      const result = await getQuestById(questFullFixture.id);
      expect(result.status).toBe(status);
    }
  });

  it('handles each valid difficulty value from the backend', async () => {
    for (const difficulty of VALID_DIFFICULTIES) {
      cacheManager.clear();
      server.use(
        http.get(`${API_BASE}/api/v1/quests/:id`, () =>
          HttpResponse.json({ ...questFullFixture, difficulty })
        )
      );

      const result = await getQuestById(questFullFixture.id);
      expect(result.difficulty).toBe(difficulty);
    }
  });
});

describe('getQuests – integration via MSW fixture', () => {
  beforeEach(() => {
    cacheManager.clear();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it('deserializes a paginated quest list correctly', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests`, () =>
        HttpResponse.json(questPaginatedFixture)
      )
    );

    const result = await getQuests();

    expect(Array.isArray(result.quests)).toBe(true);
    expect(result.quests).toHaveLength(questPaginatedFixture.quests.length);
    expect(result.total).toBe(questPaginatedFixture.total);
    expect(result.page).toBe(questPaginatedFixture.page);
    expect(result.limit).toBe(questPaginatedFixture.limit);
    expect(result.totalPages).toBe(questPaginatedFixture.totalPages);
  });

  it('each quest in the list has required fields', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests`, () =>
        HttpResponse.json(questPaginatedFixture)
      )
    );

    const result = await getQuests();

    result.quests.forEach((quest) => {
      assertRequiredQuestFields(quest);
    });
  });

  it('deserializes an empty quest list without throwing', async () => {
    server.use(
      http.get(`${API_BASE}/api/v1/quests`, () =>
        HttpResponse.json(questPaginatedEmptyFixture)
      )
    );

    const result = await getQuests();

    expect(result.quests).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies query params as URL search parameters', async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get(`${API_BASE}/api/v1/quests`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(questPaginatedEmptyFixture);
      })
    );

    await getQuests({ status: 'Active', page: 2, limit: 5 });

    expect(capturedUrl).toBeDefined();
    const url = new URL(capturedUrl!);
    expect(url.searchParams.get('status')).toBe('Active');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('5');
  });
});

// ---------------------------------------------------------------------------
// Edge cases: field boundary and type coercion
// ---------------------------------------------------------------------------

describe('Quest serialization – edge cases', () => {
  it('approvedSubmissions never exceeds totalSubmissions', () => {
    const quest = questFullFixture as QuestResponse;
    expect(quest.approvedSubmissions).toBeLessThanOrEqual(
      quest.totalSubmissions
    );
  });

  it('rejectedSubmissions never exceeds totalSubmissions', () => {
    const quest = questFullFixture as QuestResponse;
    expect(quest.rejectedSubmissions).toBeLessThanOrEqual(
      quest.totalSubmissions
    );
  });

  it('currentParticipants never exceeds maxParticipants when both are present', () => {
    const quest = questFullFixture as QuestResponse;
    if (
      quest.maxParticipants !== undefined &&
      quest.maxParticipants !== null &&
      quest.currentParticipants !== undefined &&
      quest.currentParticipants !== null
    ) {
      expect(quest.currentParticipants).toBeLessThanOrEqual(
        quest.maxParticipants
      );
    }
  });

  it('deadline is after createdAt when both are present', () => {
    const quest = questFullFixture as QuestResponse;
    if (quest.deadline) {
      expect(new Date(quest.deadline).getTime()).toBeGreaterThan(
        new Date(quest.createdAt).getTime()
      );
    }
  });

  it('updatedAt is on or after createdAt', () => {
    const quests = [
      questFullFixture,
      questMinimalFixture,
      questNullOptionalsFixture,
      ...questPaginatedFixture.quests,
    ] as QuestResponse[];

    quests.forEach((quest) => {
      expect(new Date(quest.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(quest.createdAt).getTime()
      );
    });
  });

  it('numeric rewardAmount can be parsed as a finite positive number', () => {
    const numericQuest = questMinimalFixture as QuestResponse;
    const amount = Number(numericQuest.rewardAmount);
    expect(Number.isFinite(amount)).toBe(true);
    expect(amount).toBeGreaterThan(0);
  });

  it('string rewardAmount can be parsed as a finite positive number', () => {
    const stringQuest = questFullFixture as QuestResponse;
    const amount = Number(stringQuest.rewardAmount);
    expect(Number.isFinite(amount)).toBe(true);
    expect(amount).toBeGreaterThan(0);
  });

  it('all quests in paginated fixture have unique contractQuestIds', () => {
    const ids = questPaginatedFixture.quests.map((q) => q.contractQuestId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
