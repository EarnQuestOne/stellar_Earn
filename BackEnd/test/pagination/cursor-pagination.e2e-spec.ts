import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

/**
 * Cursor Pagination E2E Tests
 *
 * Tests every paginated list endpoint for:
 *   1. First page returns { data, nextCursor, hasMore }
 *   2. Passing nextCursor as cursor returns the correct next page
 *   3. Last page has nextCursor === null and hasMore === false
 *   4. No items are duplicated or skipped across pages
 *   5. Invalid cursor is handled gracefully (treated as first page)
 *   6. limit is respected (1 ≤ limit ≤ 100)
 */
describe('Cursor Pagination (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let questId: string;

  // ── Setup ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    // Obtain tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress: process.env.TEST_ADMIN_ADDRESS });
    adminToken = adminLogin.body.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress: process.env.TEST_USER_ADDRESS });
    userToken = userLogin.body.accessToken;

    // Create a known quest we can submit against
    const quest = await request(app.getHttpServer())
      .post('/quests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Pagination Test Quest',
        description: 'Used for e2e pagination tests',
        rewardAmount: 1,
        rewardAsset: 'XLM',
        verifierType: 'MANUAL',
        verifierConfig: {},
        contractTaskId: 'pagination-test',
      });
    questId = quest.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Assert the response has the correct paginated shape */
  function assertPaginatedShape(body: any) {
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('nextCursor');
    expect(body).toHaveProperty('hasMore');
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.hasMore).toBe('boolean');
    // nextCursor is string | null
    expect(
      body.nextCursor === null || typeof body.nextCursor === 'string',
    ).toBe(true);
  }

  /** Collect all items across pages using the cursor chain */
  async function collectAllPages<T = any>(
    getPage: (cursor?: string) => Promise<request.Response>,
    maxPages = 20,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let cursor: string | null = null;
    let pages = 0;

    do {
      const res = await getPage(cursor ?? undefined);
      expect(res.status).toBe(200);
      assertPaginatedShape(res.body);
      allItems.push(...res.body.data);
      cursor = res.body.nextCursor;
      pages++;
    } while (cursor !== null && pages < maxPages);

    return allItems;
  }

  // ── GET /quests ────────────────────────────────────────────────────────────

  describe('GET /quests', () => {
    it('returns a paginated shape on first page', async () => {
      const res = await request(app.getHttpServer())
        .get('/quests?limit=5')
        .expect(200);

      assertPaginatedShape(res.body);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('advances to next page using nextCursor', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/quests?limit=2')
        .expect(200);

      if (!page1.body.hasMore) return; // not enough data to paginate

      const page2 = await request(app.getHttpServer())
        .get(`/quests?limit=2&cursor=${page1.body.nextCursor}`)
        .expect(200);

      assertPaginatedShape(page2.body);

      // No overlap between pages
      const ids1: string[] = page1.body.data.map((q: any) => q.id);
      const ids2: string[] = page2.body.data.map((q: any) => q.id);
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap).toHaveLength(0);
    });

    it('returns hasMore=false and nextCursor=null on last page', async () => {
      // Use a very large limit to reach the end in one shot
      const res = await request(app.getHttpServer())
        .get('/quests?limit=100')
        .expect(200);

      if (!res.body.hasMore) {
        expect(res.body.nextCursor).toBeNull();
      }
    });

    it('collects all quests without duplicates across pages', async () => {
      const all = await collectAllPages((cursor) =>
        request(app.getHttpServer()).get(
          `/quests?limit=3${cursor ? `&cursor=${cursor}` : ''}`,
        ),
      );

      const ids = all.map((q: any) => q.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('handles an invalid cursor gracefully (treats as first page)', async () => {
      const res = await request(app.getHttpServer())
        .get('/quests?cursor=not-a-valid-cursor')
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('rejects limit > 100', async () => {
      await request(app.getHttpServer())
        .get('/quests?limit=101')
        .expect(400);
    });

    it('filters by status and still paginates', async () => {
      const res = await request(app.getHttpServer())
        .get('/quests?status=ACTIVE&limit=5')
        .expect(200);

      assertPaginatedShape(res.body);
      res.body.data.forEach((q: any) => {
        expect(q.status).toBe('ACTIVE');
      });
    });
  });

  // ── GET /quests/:questId/submissions ───────────────────────────────────────

  describe('GET /quests/:questId/submissions', () => {
    it('returns a paginated shape', async () => {
      const res = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions?limit=5`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('advances pages without overlap', async () => {
      const page1 = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions?limit=2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (!page1.body.hasMore) return;

      const page2 = await request(app.getHttpServer())
        .get(
          `/quests/${questId}/submissions?limit=2&cursor=${page1.body.nextCursor}`,
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids1: string[] = page1.body.data.map((s: any) => s.id);
      const ids2: string[] = page2.body.data.map((s: any) => s.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('filters by status=PENDING', async () => {
      const res = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions?status=PENDING&limit=10`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
      res.body.data.forEach((s: any) => {
        expect(s.status).toBe('PENDING');
      });
    });

    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions`)
        .expect(401);
    });
  });

  // ── GET /users/search ──────────────────────────────────────────────────────

  describe('GET /users/search', () => {
    it('returns a paginated shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/search?limit=5')
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('advances pages without overlap', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/users/search?limit=2')
        .expect(200);

      if (!page1.body.hasMore) return;

      const page2 = await request(app.getHttpServer())
        .get(`/users/search?limit=2&cursor=${page1.body.nextCursor}`)
        .expect(200);

      const ids1: string[] = page1.body.data.map((u: any) => u.id);
      const ids2: string[] = page2.body.data.map((u: any) => u.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('search query filters results', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/search?query=test&limit=10')
        .expect(200);

      assertPaginatedShape(res.body);
    });
  });

  // ── GET /users/leaderboard ─────────────────────────────────────────────────

  describe('GET /users/leaderboard', () => {
    it('returns a paginated shape sorted by XP', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/leaderboard?limit=5')
        .expect(200);

      assertPaginatedShape(res.body);

      // Verify descending XP order within the page
      const xps: number[] = res.body.data.map((u: any) => u.xp);
      for (let i = 1; i < xps.length; i++) {
        expect(xps[i]).toBeLessThanOrEqual(xps[i - 1]);
      }
    });

    it('advances to next leaderboard page', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/users/leaderboard?limit=3')
        .expect(200);

      if (!page1.body.hasMore) return;

      const page2 = await request(app.getHttpServer())
        .get(`/users/leaderboard?limit=3&cursor=${page1.body.nextCursor}`)
        .expect(200);

      assertPaginatedShape(page2.body);

      // XP on page 2 should be ≤ lowest XP on page 1
      const minXpPage1 = Math.min(...page1.body.data.map((u: any) => u.xp));
      const maxXpPage2 = Math.max(...page2.body.data.map((u: any) => u.xp));
      expect(maxXpPage2).toBeLessThanOrEqual(minXpPage1);
    });
  });

  // ── GET /users/:address/quests ─────────────────────────────────────────────

  describe('GET /users/:address/quests', () => {
    it('returns a paginated shape', async () => {
      const address = process.env.TEST_USER_ADDRESS!;
      const res = await request(app.getHttpServer())
        .get(`/users/${address}/quests?limit=5`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('returns 404 for unknown address', async () => {
      await request(app.getHttpServer())
        .get('/users/GUNKNOWNADDRESS000000000000000000000000000000000000000000/quests')
        .expect(404);
    });
  });

  // ── GET /payouts/history ───────────────────────────────────────────────────

  describe('GET /payouts/history', () => {
    it('returns a paginated shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/payouts/history?limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('advances pages without overlap', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/payouts/history?limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      if (!page1.body.hasMore) return;

      const page2 = await request(app.getHttpServer())
        .get(`/payouts/history?limit=2&cursor=${page1.body.nextCursor}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const ids1: string[] = page1.body.data.map((p: any) => p.id);
      const ids2: string[] = page2.body.data.map((p: any) => p.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('collects all payouts without duplicates', async () => {
      const all = await collectAllPages((cursor) =>
        request(app.getHttpServer())
          .get(`/payouts/history?limit=3${cursor ? `&cursor=${cursor}` : ''}`)
          .set('Authorization', `Bearer ${userToken}`),
      );

      const ids = all.map((p: any) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/payouts/history').expect(401);
    });
  });

  // ── GET /payouts/admin/all ─────────────────────────────────────────────────

  describe('GET /payouts/admin/all', () => {
    it('returns a paginated shape (admin only)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payouts/admin/all?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('returns 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/payouts/admin/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/payouts/admin/all?status=completed&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
      res.body.data.forEach((p: any) => {
        expect(p.status).toBe('completed');
      });
    });
  });

  // ── GET /notifications ─────────────────────────────────────────────────────

  describe('GET /notifications', () => {
    it('returns a paginated shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('advances pages without overlap', async () => {
      const page1 = await request(app.getHttpServer())
        .get('/notifications?limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      if (!page1.body.hasMore) return;

      const page2 = await request(app.getHttpServer())
        .get(`/notifications?limit=2&cursor=${page1.body.nextCursor}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const ids1: string[] = page1.body.data.map((n: any) => n.id);
      const ids2: string[] = page2.body.data.map((n: any) => n.id);
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('unreadOnly=true filters to unread notifications only', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?unreadOnly=true&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
      res.body.data.forEach((n: any) => {
        expect(n.read).toBe(false);
      });
    });

    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  // ── GET /users/admins/list ─────────────────────────────────────────────────

  describe('GET /users/admins/list', () => {
    it('returns a paginated shape (admin only)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/admins/list?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assertPaginatedShape(res.body);
    });

    it('returns 403 for non-admin', async () => {
      await request(app.getHttpServer())
        .get('/users/admins/list')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});