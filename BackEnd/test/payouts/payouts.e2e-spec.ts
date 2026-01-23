import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Keypair } from 'stellar-sdk';
import { DataSource } from 'typeorm';
import { Payout, PayoutStatus, PayoutType } from '../../src/modules/payouts/entities/payout.entity';

describe('Payouts (e2e)', () => {
  let app: INestApplication<App>;
  let testKeypair: Keypair;
  let stellarAddress: string;
  let accessToken: string;
  let dataSource: DataSource;
  let testPayoutId: string;
  let testSubmissionId: string;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Generate test Stellar keypair and authenticate
    testKeypair = Keypair.random();
    stellarAddress = testKeypair.publicKey();

    // Get challenge and login
    const challengeResponse = await request(app.getHttpServer())
      .post('/auth/challenge')
      .send({ stellarAddress });

    const challenge = challengeResponse.body.challenge;
    const signature = testKeypair.sign(Buffer.from(challenge, 'utf8')).toString('base64');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress, signature, challenge });

    accessToken = loginResponse.body.accessToken;

    // Create a test payout in the database
    testSubmissionId = '550e8400-e29b-41d4-a716-446655440001';
    const payoutRepository = dataSource.getRepository(Payout);
    const testPayout = payoutRepository.create({
      stellarAddress,
      amount: 10.5,
      asset: 'XLM',
      type: PayoutType.QUEST_REWARD,
      status: PayoutStatus.PENDING,
      questId: '550e8400-e29b-41d4-a716-446655440002',
      submissionId: testSubmissionId,
    });
    const savedPayout = await payoutRepository.save(testPayout);
    testPayoutId = savedPayout.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource && dataSource.isInitialized) {
      const payoutRepository = dataSource.getRepository(Payout);
      await payoutRepository.delete({ stellarAddress });
    }
    // Wait for any pending async tasks to finish
    await new Promise(resolve => setTimeout(resolve, 500));
    await app.close();
  });

  describe('/payouts/history (GET)', () => {
    it('should return empty history for new user', async () => {
      // Create a new keypair for this test
      const newKeypair = Keypair.random();
      const newAddress = newKeypair.publicKey();

      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ stellarAddress: newAddress });

      const challenge = challengeResponse.body.challenge;
      const signature = newKeypair.sign(Buffer.from(challenge, 'utf8')).toString('base64');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ stellarAddress: newAddress, signature, challenge });

      const newToken = loginResponse.body.accessToken;

      return request(app.getHttpServer())
        .get('/payouts/history')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('payouts');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.payouts)).toBe(true);
        });
    });

    it('should return payout history for user with payouts', () => {
      return request(app.getHttpServer())
        .get('/payouts/history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.payouts.length).toBeGreaterThan(0);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/payouts/history?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(5);
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get('/payouts/history?status=pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          res.body.payouts.forEach((payout: { status: string }) => {
            expect(payout.status).toBe('pending');
          });
        });
    });

    it('should reject unauthenticated request', () => {
      return request(app.getHttpServer())
        .get('/payouts/history')
        .expect(401);
    });
  });

  describe('/payouts/:id (GET)', () => {
    it('should return payout details by ID', () => {
      return request(app.getHttpServer())
        .get(`/payouts/${testPayoutId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testPayoutId);
          expect(res.body.stellarAddress).toBe(stellarAddress);
          expect(res.body.amount).toBe(10.5);
          expect(res.body.asset).toBe('XLM');
          expect(res.body.status).toBe('pending');
        });
    });

    it('should return 404 for non-existent payout', () => {
      return request(app.getHttpServer())
        .get('/payouts/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject invalid UUID format', () => {
      return request(app.getHttpServer())
        .get('/payouts/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('/payouts/stats (GET)', () => {
    it('should return payout statistics', () => {
      return request(app.getHttpServer())
        .get('/payouts/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalPayouts');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('pendingPayouts');
          expect(res.body).toHaveProperty('pendingAmount');
          expect(res.body).toHaveProperty('completedPayouts');
          expect(res.body).toHaveProperty('completedAmount');
          expect(res.body).toHaveProperty('failedPayouts');
        });
    });
  });

  describe('/payouts/claim (POST)', () => {
    it('should claim a pending payout', async () => {
      // Create a new payout to claim
      const payoutRepository = dataSource.getRepository(Payout);
      const newSubmissionId = '550e8400-e29b-41d4-a716-446655440003';
      const claimablePayout = payoutRepository.create({
        stellarAddress,
        amount: 5.0,
        asset: 'XLM',
        type: PayoutType.QUEST_REWARD,
        status: PayoutStatus.PENDING,
        questId: '550e8400-e29b-41d4-a716-446655440004',
        submissionId: newSubmissionId,
      });
      await payoutRepository.save(claimablePayout);

      return request(app.getHttpServer())
        .post('/payouts/claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          submissionId: newSubmissionId,
          stellarAddress,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('processing');
          expect(res.body.claimedAt).toBeTruthy();
        });
    });

    it('should reject claim for non-existent submission', () => {
      return request(app.getHttpServer())
        .post('/payouts/claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          submissionId: '550e8400-e29b-41d4-a716-446655440099',
          stellarAddress,
        })
        .expect(404);
    });

    it('should reject claim with address mismatch', async () => {
      // Create a payout for a different address
      const payoutRepository = dataSource.getRepository(Payout);
      const otherAddress = Keypair.random().publicKey();
      const mismatchSubmissionId = '550e8400-e29b-41d4-a716-446655440005';
      const otherPayout = payoutRepository.create({
        stellarAddress: otherAddress,
        amount: 5.0,
        asset: 'XLM',
        type: PayoutType.QUEST_REWARD,
        status: PayoutStatus.PENDING,
        submissionId: mismatchSubmissionId,
      });
      await payoutRepository.save(otherPayout);

      return request(app.getHttpServer())
        .post('/payouts/claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          submissionId: mismatchSubmissionId,
          stellarAddress: otherAddress,
        })
        .expect(404); // User can't access this payout
    });

    it('should reject claim for already claimed payout', async () => {
      const payoutRepository = dataSource.getRepository(Payout);
      const claimedSubmissionId = '550e8400-e29b-41d4-a716-446655440006';
      const claimedPayout = payoutRepository.create({
        stellarAddress,
        amount: 5.0,
        asset: 'XLM',
        type: PayoutType.QUEST_REWARD,
        status: PayoutStatus.COMPLETED,
        submissionId: claimedSubmissionId,
        claimedAt: new Date(),
      });
      await payoutRepository.save(claimedPayout);

      return request(app.getHttpServer())
        .post('/payouts/claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          submissionId: claimedSubmissionId,
          stellarAddress,
        })
        .expect(400);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/payouts/claim')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          submissionId: 'not-a-uuid',
          stellarAddress: 'invalid',
        })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive claim attempts', async () => {
      // Send requests sequentially to be more predictable
      let rateLimited = false;
      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .post('/payouts/claim')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            submissionId: '550e8400-e29b-41d4-a716-446655440099',
            stellarAddress,
          });

        if (res.status === 429) {
          rateLimited = true;
          break;
        }
      }
      expect(rateLimited).toBe(true);
    });
  });
});
