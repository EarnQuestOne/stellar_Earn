import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Keypair } from 'stellar-sdk';
import { DataSource } from 'typeorm';
import {
  Quest,
  QuestStatus,
} from '../../src/modules/analytics/entities/quest.entity';
import {
  Submission,
  SubmissionStatus,
} from '../../src/modules/analytics/entities/submission.entity';
import { Payout } from '../../src/modules/analytics/entities/payout.entity';
import { User } from 'src/modules/users/entities/user.entity';

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminKeypair: Keypair;
  let userKeypair: Keypair;
  let adminAddress: string;
  let userAddress: string;
  let adminToken: string;
  let userToken: string;

  // Test data
  let testUsers: User[];
  let testQuests: Quest[];
  let testSubmissions: Submission[];
  let testPayouts: Payout[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = app.get(DataSource);

    // Generate test keypairs
    adminKeypair = Keypair.random();
    userKeypair = Keypair.random();
    adminAddress = adminKeypair.publicKey();
    userAddress = userKeypair.publicKey();

    // Set admin address in environment
    process.env.ADMIN_ADDRESSES = adminAddress;

    // Authenticate as admin
    adminToken = await authenticateUser(adminAddress, adminKeypair);

    // Authenticate as regular user
    userToken = await authenticateUser(userAddress, userKeypair);

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource) {
      await dataSource.getRepository(Payout).delete({});
      await dataSource.getRepository(Submission).delete({});
      await dataSource.getRepository(Quest).delete({});
      await dataSource.getRepository(User).delete({});
    }
    await app.close();
  });

  async function authenticateUser(
    stellarAddress: string,
    keypair: Keypair,
  ): Promise<string> {
    const challengeResponse = await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ stellarAddress });

    const challenge = challengeResponse.body.challenge;
    const signature = keypair
      .sign(Buffer.from(challenge, 'utf8'))
      .toString('base64');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress, signature, challenge });

    return loginResponse.body.accessToken;
  }

  async function seedTestData() {
    const userRepo = dataSource.getRepository(User);
    const questRepo = dataSource.getRepository(Quest);
    const submissionRepo = dataSource.getRepository(Submission);
    const payoutRepo = dataSource.getRepository(Payout);

    // Create test users
    testUsers = [];
    for (let i = 0; i < 10; i++) {
      const user = userRepo.create({
        stellarAddress: `GTEST${i}${'A'.repeat(50)}`,
        username: `testuser${i}`,
        totalXp: i * 100,
        level: Math.floor(i / 2) + 1,
        questsCompleted: i,
        badges: i > 5 ? ['early_adopter'] : [],
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
      testUsers.push(await userRepo.save(user));
    }

    // Create test quests
    testQuests = [];
    for (let i = 0; i < 5; i++) {
      const quest = questRepo.create({
        contractQuestId: `quest-${i}`,
        title: `Test Quest ${i}`,
        description: `Description for test quest ${i}`,
        creator: testUsers[0],
        rewardAsset: 'XLM',
        rewardAmount: '1000000',
        verifierAddress: adminAddress,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: i < 3 ? QuestStatus.ACTIVE : QuestStatus.COMPLETED,
        totalClaims: i * 2,
        totalSubmissions: i * 5,
        approvedSubmissions: i * 3,
        rejectedSubmissions: i,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      });
      testQuests.push(await questRepo.save(quest));
    }

    // Create test submissions
    testSubmissions = [];
    for (let i = 0; i < 20; i++) {
      const submission = submissionRepo.create({
        contractSubmissionId: `submission-${i}`,
        quest: testQuests[i % 5],
        user: testUsers[i % 10],
        proofHash: `hash-${i}`,
        status:
          i % 4 === 0
            ? SubmissionStatus.APPROVED
            : i % 4 === 1
              ? SubmissionStatus.REJECTED
              : i % 4 === 2
                ? SubmissionStatus.PAID
                : SubmissionStatus.PENDING,
        submittedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
        reviewedAt:
          i % 4 !== 3
            ? new Date(Date.now() - i * 12 * 60 * 60 * 1000 + 60 * 60 * 1000)
            : undefined,
        paidAt:
          i % 4 === 2
            ? new Date(Date.now() - i * 12 * 60 * 60 * 1000 + 120 * 60 * 1000)
            : undefined,
        createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
      });
      const savedSubmission = await submissionRepo.save(submission);
      testSubmissions.push(savedSubmission);
    }

    // Create test payouts
    testPayouts = [];
    const paidSubmissions = testSubmissions.filter(
      (s) => s.status === SubmissionStatus.PAID,
    );
    for (let i = 0; i < paidSubmissions.length; i++) {
      const payout = payoutRepo.create({
        submission: paidSubmissions[i],
        recipient: paidSubmissions[i].user,
        amount: '1000000',
        assetCode: 'XLM',
        transactionHash: `tx-hash-${i}`,
        paidAt: paidSubmissions[i].paidAt,
        createdAt: paidSubmissions[i].paidAt,
      });
      testPayouts.push(await payoutRepo.save(payout));
    }
  }

  describe('GET /analytics/platform', () => {
    it('should return platform statistics for admin', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body).toHaveProperty('totalQuests');
          expect(res.body).toHaveProperty('totalSubmissions');
          expect(res.body).toHaveProperty('approvalRate');
          expect(res.body).toHaveProperty('timeSeries');
          expect(Array.isArray(res.body.timeSeries)).toBe(true);
          expect(res.body).toHaveProperty('questsByStatus');
          expect(res.body).toHaveProperty('submissionsByStatus');
        });
    });

    it('should reject non-admin users', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should filter by date range', () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      return request(app.getHttpServer())
        .get('/analytics/platform')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body).toHaveProperty('timeSeries');
        });
    });

    it('should support different granularities', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .query({ granularity: 'week' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /analytics/quests', () => {
    it('should return quest performance metrics', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('quests');
          expect(res.body).toHaveProperty('summary');
          expect(Array.isArray(res.body.quests)).toBe(true);
          if (res.body.quests.length > 0) {
            const quest = res.body.quests[0];
            expect(quest).toHaveProperty('questId');
            expect(quest).toHaveProperty('title');
            expect(quest).toHaveProperty('totalSubmissions');
            expect(quest).toHaveProperty('approvalRate');
          }
        });
    });

    it('should filter by quest status', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ status: 'Active' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.quests.length > 0) {
            res.body.quests.forEach((quest) => {
              expect(quest.status).toBe('Active');
            });
          }
        });
    });

    it('should filter by specific quest ID', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ questId: testQuests[0].id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.quests.length > 0) {
            expect(res.body.quests[0].questId).toBe(testQuests[0].id);
          }
        });
    });

    it('should sort by different fields', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ sortBy: 'approval_rate' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ limit: 3 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.quests.length).toBeLessThanOrEqual(3);
        });
    });

    it('should reject non-admin users', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /analytics/users', () => {
    it('should return user engagement metrics', () => {
      return request(app.getHttpServer())
        .get('/analytics/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('users');
          expect(res.body).toHaveProperty('summary');
          expect(res.body).toHaveProperty('cohortAnalysis');
          expect(res.body).toHaveProperty('userGrowth');
          expect(Array.isArray(res.body.users)).toBe(true);
          if (res.body.users.length > 0) {
            const user = res.body.users[0];
            expect(user).toHaveProperty('stellarAddress');
            expect(user).toHaveProperty('totalXp');
            expect(user).toHaveProperty('questsCompleted');
            expect(user).toHaveProperty('approvalRate');
          }
        });
    });

    it('should filter by specific user', () => {
      return request(app.getHttpServer())
        .get('/analytics/users')
        .query({ stellarAddress: testUsers[0].stellarAddress })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          if (res.body.users.length > 0) {
            expect(res.body.users[0].stellarAddress).toBe(
              testUsers[0].stellarAddress,
            );
          }
        });
    });

    it('should sort by different metrics', () => {
      return request(app.getHttpServer())
        .get('/analytics/users')
        .query({ sortBy: 'quests_completed' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should calculate retention rates', () => {
      return request(app.getHttpServer())
        .get('/analytics/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.summary).toHaveProperty('retentionRate');
          expect(typeof res.body.summary.retentionRate).toBe('number');
        });
    });

    it('should reject non-admin users', () => {
      return request(app.getHttpServer())
        .get('/analytics/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive platform requests', async () => {
      const requests = Array(12)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/analytics/platform')
            .set('Authorization', `Bearer ${adminToken}`),
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    }, 10000);
  });

  describe('Validation', () => {
    it('should reject invalid granularity', () => {
      return request(app.getHttpServer())
        .get('/analytics/platform')
        .query({ granularity: 'invalid' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should reject invalid limit (too high)', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ limit: 999 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should reject invalid limit (too low)', () => {
      return request(app.getHttpServer())
        .get('/analytics/quests')
        .query({ limit: 0 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
