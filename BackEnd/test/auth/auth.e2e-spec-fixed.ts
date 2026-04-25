/**
 * Auth E2E Tests - Fixed Version with Stability Improvements
 * Demonstrates best practices for stable E2E tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { Keypair } from 'stellar-sdk';
import {
  waitForAppReady,
  sleep,
  createE2ETestContext,
  retryWithBackoff,
  waitFor,
  DEFAULT_RETRY_CONFIG,
} from '../e2e-helpers';

describe('Authentication E2E - Fixed (e2e)', () => {
  let app: INestApplication<App>;
  let ctx: any; // E2E test context
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

    // Wait for app to be fully ready before running tests
    try {
      await waitForAppReady(app);
    } catch (error) {
      console.error('Application failed to initialize:', error);
      throw error;
    }

    // Create test context with helper utilities
    ctx = createE2ETestContext(app);

    // Generate test Stellar keypair
    testKeypair = Keypair.random();
    stellarAddress = testKeypair.publicKey();
  });

  afterAll(async () => {
    // Ensure all pending requests are resolved
    await sleep(100);
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test
    jest.clearAllMocks();
    await sleep(50); // Small delay to ensure cleanup
  });

  describe('/auth/challenge (POST)', () => {
    it('should generate a challenge for valid Stellar address', async () => {
      // Retry the request in case of transient failures
      const response = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/challenge')
            .send({ stellarAddress })
            .expect(200),
        { maxAttempts: 3, initialDelayMs: 100 },
      );

      expect(response.body).toHaveProperty('challenge');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.challenge).toContain(stellarAddress);

      // Validate expiration time is in the future
      const expiresAt = new Date(response.body.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject invalid Stellar address format', async () => {
      const invalidAddresses = [
        'invalid-address',
        'too-short',
        '',
        'not-a-key',
      ];

      // Test multiple invalid addresses with retry
      for (const address of invalidAddresses) {
        await retryWithBackoff(
          () =>
            ctx
              .request('post', '/auth/challenge')
              .send({ stellarAddress: address })
              .expect(400),
          { maxAttempts: 2 },
        );
      }
    });

    it('should handle rapid consecutive requests', async () => {
      // Test idempotency with rapid requests
      const requests = Array.from({ length: 5 }, () =>
        ctx
          .request('post', '/auth/challenge')
          .send({ stellarAddress })
          .expect(200),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      expect(responses).toHaveLength(5);
      responses.forEach((res) => {
        expect(res.body).toHaveProperty('challenge');
      });
    });
  });

  describe('/auth/login (POST)', () => {
    let challenge: string;

    beforeEach(async () => {
      // Get a fresh challenge with retry
      const response = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/challenge')
            .send({ stellarAddress })
            .expect(200),
      );

      challenge = response.body.challenge;

      // Validate we got a challenge
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should login with valid signature', async () => {
      // Sign the challenge
      const messageBuffer = Buffer.from(challenge, 'utf8');
      const signature = testKeypair.sign(messageBuffer).toString('base64');

      // Login with retry
      const response = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/login')
            .send({
              stellarAddress,
              signature,
              challenge,
            })
            .expect(200),
        { maxAttempts: 3 },
      );

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.stellarAddress).toBe(stellarAddress);

      // Validate token format
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);

      // Save tokens for later tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid signature', async () => {
      // Use wrong keypair to sign
      const wrongKeypair = Keypair.random();
      const messageBuffer = Buffer.from(challenge, 'utf8');
      const invalidSignature = wrongKeypair
        .sign(messageBuffer)
        .toString('base64');

      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/login')
            .send({
              stellarAddress,
              signature: invalidSignature,
              challenge,
            })
            .expect(401),
        { maxAttempts: 2 },
      );
    });

    it('should reject expired challenge', async () => {
      // Create an old challenge timestamp (more than 5 minutes ago)
      const expiredChallenge = challenge.replace(
        /\d{13}/,
        String(Date.now() - 6 * 60 * 1000),
      );

      const messageBuffer = Buffer.from(expiredChallenge, 'utf8');
      const signature = testKeypair.sign(messageBuffer).toString('base64');

      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/login')
            .send({
              stellarAddress,
              signature,
              challenge: expiredChallenge,
            })
            .expect(401),
        { maxAttempts: 2 },
      );
    });

    it('should reject modified challenge', async () => {
      const modifiedChallenge = challenge.slice(0, -5) + 'XXXXX';
      const messageBuffer = Buffer.from(challenge, 'utf8');
      const signature = testKeypair.sign(messageBuffer).toString('base64');

      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/login')
            .send({
              stellarAddress,
              signature,
              challenge: modifiedChallenge,
            })
            .expect(401),
        { maxAttempts: 2 },
      );
    });
  });

  describe('/auth/refresh (POST)', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Get valid tokens first
      const challengeRes = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/challenge')
            .send({ stellarAddress })
            .expect(200),
      );

      const challenge = challengeRes.body.challenge;
      const messageBuffer = Buffer.from(challenge, 'utf8');
      const signature = testKeypair.sign(messageBuffer).toString('base64');

      const loginRes = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/login')
            .send({ stellarAddress, signature, challenge })
            .expect(200),
      );

      validRefreshToken = loginRes.body.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/refresh')
            .send({ refreshToken: validRefreshToken })
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty('accessToken');
              expect(res.body).toHaveProperty('refreshToken');
              expect(res.body.accessToken).not.toBe(refreshToken);
            }),
        { maxAttempts: 3 },
      );
    });

    it('should reject invalid refresh token', async () => {
      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/refresh')
            .send({ refreshToken: 'invalid-token' })
            .expect(401),
        { maxAttempts: 2 },
      );
    });

    it('should invalidate old refresh token after refresh', async () => {
      // Get new tokens
      const refreshRes = await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/refresh')
            .send({ refreshToken: validRefreshToken })
            .expect(200),
      );

      const newRefreshToken = refreshRes.body.refreshToken;

      // Wait a bit to ensure database is updated
      await sleep(100);

      // Old token should be invalid now
      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/refresh')
            .send({ refreshToken: validRefreshToken })
            .expect(401),
        { maxAttempts: 2 },
      );

      // New token should work
      await retryWithBackoff(
        () =>
          ctx
            .request('post', '/auth/refresh')
            .send({ refreshToken: newRefreshToken })
            .expect(200),
        { maxAttempts: 2 },
      );
    });
  });

  describe('Concurrent Auth Operations', () => {
    it('should handle concurrent challenge requests', async () => {
      const addresses = Array.from({ length: 5 }, () => Keypair.random().publicKey());

      const results = await Promise.all(
        addresses.map((addr) =>
          retryWithBackoff(() =>
            ctx
              .request('post', '/auth/challenge')
              .send({ stellarAddress: addr })
              .expect(200),
          ),
        ),
      );

      expect(results).toHaveLength(5);
      results.forEach((res) => {
        expect(res.body).toHaveProperty('challenge');
      });
    });

    it('should handle concurrent login attempts', async () => {
      // Get challenges first
      const keypairs = Array.from({ length: 3 }, () => Keypair.random());

      const challenges = await Promise.all(
        keypairs.map((kp) =>
          retryWithBackoff(() =>
            ctx
              .request('post', '/auth/challenge')
              .send({ stellarAddress: kp.publicKey() })
              .expect(200),
          ),
        ),
      );

      // Login with all
      const loginResults = await Promise.all(
        keypairs.map((kp, idx) => {
          const challenge = challenges[idx].body.challenge;
          const messageBuffer = Buffer.from(challenge, 'utf8');
          const signature = kp.sign(messageBuffer).toString('base64');

          return retryWithBackoff(() =>
            ctx
              .request('post', '/auth/login')
              .send({
                stellarAddress: kp.publicKey(),
                signature,
                challenge,
              })
              .expect(200),
          );
        }),
      );

      expect(loginResults).toHaveLength(3);
      loginResults.forEach((res) => {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
      });
    });
  });
});
