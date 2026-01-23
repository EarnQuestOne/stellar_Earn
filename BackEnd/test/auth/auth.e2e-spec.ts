import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Keypair } from 'stellar-sdk';
import { generateChallengeMessage } from '../../src/modules/auth/utils/signature';

describe('Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let testKeypair: Keypair;
  let stellarAddress: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Generate test Stellar keypair
    testKeypair = Keypair.random();
    stellarAddress = testKeypair.publicKey();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/challenge (POST)', () => {
    it('should generate a challenge for valid Stellar address', () => {
      return request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ stellarAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('challenge');
          expect(res.body).toHaveProperty('expiresAt');
          expect(res.body.challenge).toContain(stellarAddress);
        });
    });

    it('should reject invalid Stellar address format', () => {
      return request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ stellarAddress: 'invalid-address' })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    let challenge: string;

    beforeEach(async () => {
      // Get a fresh challenge
      const response = await request(app.getHttpServer())
        .post('/auth/challenge')
        .send({ stellarAddress });

      challenge = response.body.challenge;
    });

    it('should login with valid signature', async () => {
      // Sign the challenge
      const messageBuffer = Buffer.from(challenge, 'utf8');
      const signature = testKeypair.sign(messageBuffer).toString('base64');

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          stellarAddress,
          signature,
          challenge,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.stellarAddress).toBe(stellarAddress);

          // Save tokens for later tests
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'invalid-signature-base64';

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          stellarAddress,
          signature: invalidSignature,
          challenge,
        })
        .expect(401);
    });

    it('should reject expired challenge', async () => {
      // Create an old challenge (simulate expiration)
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const expiredChallenge = generateChallengeMessage(
        stellarAddress,
        oldTimestamp,
      );
      const signature = testKeypair
        .sign(Buffer.from(expiredChallenge, 'utf8'))
        .toString('base64');

      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          stellarAddress,
          signature,
          challenge: expiredChallenge,
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should get profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.stellarAddress).toBe(stellarAddress);
          expect(res.body).toHaveProperty('role');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh tokens with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).not.toBe(accessToken);

          // Update tokens
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should reject reused refresh token', async () => {
      // Use the refresh token once
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken });

      const oldRefreshToken = refreshToken;
      refreshToken = response.body.refreshToken;

      // Try to use the old token again
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should logout and invalidate refresh tokens', async () => {
      const oldRefreshToken = refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Refresh token should no longer work
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive login attempts', async () => {
      const challenge = (
        await request(app.getHttpServer())
          .post('/auth/challenge')
          .send({ stellarAddress })
      ).body.challenge;

      const signature = testKeypair
        .sign(Buffer.from(challenge, 'utf8'))
        .toString('base64');

      // Make multiple requests quickly
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ stellarAddress, signature, challenge }),
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some((res) => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});
