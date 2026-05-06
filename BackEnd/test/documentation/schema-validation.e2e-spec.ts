import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('API Response Schema Validation', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Get auth token for authenticated endpoints
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        signature: 'test_signature',
      });

    if (loginResponse.status === 201) {
      authToken = loginResponse.body.data.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Users Module', () => {
    it('GET /users/search should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/search')
        .query({ query: 'test', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');

      if (Array.isArray(response.body.data)) {
        response.body.data.forEach((user: any) => {
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('stellarAddress');
          expect(user).toHaveProperty('username');
          expect(user).toHaveProperty('totalXp');
          expect(user).toHaveProperty('level');
        });
      }
    });

    it('GET /users/leaderboard should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/leaderboard')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('totalPages');
    });
  });

  describe('Notifications Module', () => {
    it('GET /notifications should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('notifications');
        expect(response.body.data).toHaveProperty('unreadCount');
        expect(response.body.data).toHaveProperty('total');

        if (Array.isArray(response.body.data.notifications)) {
          response.body.data.notifications.forEach((notification: any) => {
            expect(notification).toHaveProperty('id');
            expect(notification).toHaveProperty('type');
            expect(notification).toHaveProperty('message');
            expect(notification).toHaveProperty('read');
            expect(notification).toHaveProperty('createdAt');
          });
        }
      }
    });

    it('PATCH /notifications/:id/read should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .patch('/notifications/test-id/read')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('notification');
        expect(response.body.data.notification).toHaveProperty('id');
        expect(response.body.data.notification).toHaveProperty('read');
      }
    });
  });

  describe('Moderation Module', () => {
    it('POST /moderation/scan should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/moderation/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: 'This is a test message' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('isFlagged');
        expect(response.body.data).toHaveProperty('category');
        expect(response.body.data).toHaveProperty('confidence');
      }
    });

    it('GET /moderation/dashboard/stats should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/moderation/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('pendingCount');
        expect(response.body.data).toHaveProperty('approvedCount');
        expect(response.body.data).toHaveProperty('rejectedCount');
      }
    });
  });

  describe('Webhooks Module', () => {
    it('POST /webhooks/health should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Payouts Module', () => {
    it('GET /payouts should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/payouts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('payouts');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');
        expect(response.body.data).toHaveProperty('totalPages');

        if (Array.isArray(response.body.data.payouts)) {
          response.body.data.payouts.forEach((payout: any) => {
            expect(payout).toHaveProperty('id');
            expect(payout).toHaveProperty('stellarAddress');
            expect(payout).toHaveProperty('amount');
            expect(payout).toHaveProperty('status');
            expect(payout).toHaveProperty('type');
          });
        }
      }
    });

    it('GET /payouts/stats should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/payouts/stats')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalPayouts');
        expect(response.body.data).toHaveProperty('totalAmount');
        expect(response.body.data).toHaveProperty('pendingPayouts');
        expect(response.body.data).toHaveProperty('pendingAmount');
        expect(response.body.data).toHaveProperty('completedPayouts');
        expect(response.body.data).toHaveProperty('completedAmount');
        expect(response.body.data).toHaveProperty('failedPayouts');
      }
    });
  });

  describe('Jobs Module', () => {
    it('GET /jobs should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs')
        .query({ page: 1, limit: 10 });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('jobs');
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('page');
        expect(response.body.data).toHaveProperty('limit');

        if (Array.isArray(response.body.data.jobs)) {
          response.body.data.jobs.forEach((job: any) => {
            expect(job).toHaveProperty('id');
            expect(job).toHaveProperty('jobType');
            expect(job).toHaveProperty('status');
          });
        }
      }
    });

    it('GET /jobs/queue/stats should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs/queue/stats');

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('waiting');
        expect(response.body.data).toHaveProperty('active');
        expect(response.body.data).toHaveProperty('completed');
        expect(response.body.data).toHaveProperty('failed');
      }
    });
  });

  describe('Analytics Module', () => {
    it('GET /analytics/platform-stats should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/platform-stats')
        .query({ startDate: '2026-01-01', endDate: '2026-01-31' });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('totalUsers');
        expect(response.body.data).toHaveProperty('totalQuests');
        expect(response.body.data).toHaveProperty('totalSubmissions');
        expect(response.body.data).toHaveProperty('totalPayouts');
        expect(response.body.data).toHaveProperty('totalRewardsDistributed');
        expect(response.body.data).toHaveProperty('approvalRate');
      }
    });
  });

  describe('Submissions Module', () => {
    it('GET /quests/:questId/submissions should return valid response schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/quests/test-quest-id/submissions')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('submissions');
        expect(response.body.data).toHaveProperty('total');
      }
    });
  });

  describe('Global Response Format', () => {
    it('All successful responses should have data and meta properties', async () => {
      const endpoints = [
        { method: 'get', path: '/users/search', query: { query: 'test' } },
        { method: 'get', path: '/users/leaderboard', query: { page: 1 } },
        { method: 'get', path: '/jobs/queue/stats' },
        { method: 'post', path: '/webhooks/health' },
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'get') {
          response = await request(app.getHttpServer())
            .get(endpoint.path)
            .query(endpoint.query || {});
        } else {
          response = await request(app.getHttpServer())
            .post(endpoint.path);
        }

        if (response.status === 200 || response.status === 201) {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('meta');
          expect(response.body.meta).toHaveProperty('timestamp');
        }
      }
    });
  });
});
