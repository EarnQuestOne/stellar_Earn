import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Keypair } from 'stellar-sdk';

import { AppModule } from '#src/app.module';

const sleep = (ms = 2100) => new Promise((resolve) => setTimeout(resolve, ms));

jest.setTimeout(120000);

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication<App>;
  let server: any;

  const adminKeypair = Keypair.random();
  const userKeypair = Keypair.random();
  const secondUserKeypair = Keypair.random();

  const login = async (keypair: Keypair): Promise<string> => {
    const stellarAddress = keypair.publicKey();

    const challengeResponse = await request(server)
      .post('/auth/challenge')
      .send({ stellarAddress });

    const challenge = challengeResponse.body.challenge as string;
    const signature = keypair
      .sign(Buffer.from(challenge, 'utf8'))
      .toString('base64');

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ stellarAddress, signature, challenge });

    return loginResponse.body.accessToken;
  };

  beforeAll(async () => {
    // High default/auth limits so login() helpers never get throttled.
    // Individual tests assert against per-user limits which are lower.
    process.env.RATE_LIMIT_TTL = '2';
    process.env.RATE_LIMIT_LIMIT = '100';
    process.env.RATE_LIMIT_AUTH_TTL = '2';
    process.env.RATE_LIMIT_AUTH_LIMIT = '100';

    // Per-user rate limits for testing (these are what the tests assert against)
    process.env.RATE_LIMIT_ANONYMOUS_LIMIT = '2';
    process.env.RATE_LIMIT_ANONYMOUS_TTL = '2';
    process.env.RATE_LIMIT_USER_LIMIT = '3';
    process.env.RATE_LIMIT_USER_TTL = '2';
    process.env.RATE_LIMIT_VERIFIER_LIMIT = '5';
    process.env.RATE_LIMIT_VERIFIER_TTL = '2';
    process.env.RATE_LIMIT_AUTH_USER_LIMIT = '2';
    process.env.RATE_LIMIT_AUTH_USER_TTL = '2';

    process.env.ADMIN_ADDRESSES = adminKeypair.publicKey();

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
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces rate limit headers', async () => {
    const first = await request(server).get('/');
    expect(first.headers['x-ratelimit-limit']).toBeDefined();
    expect(first.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('uses user identities for tracking and bypasses admins', async () => {
    await sleep();

    const userToken = await login(userKeypair);
    const anotherUserToken = await login(secondUserKeypair);
    const adminToken = await login(adminKeypair);

    // User should be blocked after exceeding per-user limit (3)
    const userFirst = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    const userSecond = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    const userThird = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    const userBlocked = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);

    expect(userFirst.status).toBe(200);
    expect(userSecond.status).toBe(200);
    expect(userThird.status).toBe(200);
    expect(userBlocked.status).toBe(429);

    // Different user should still have their own quota
    const otherUser = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${anotherUserToken}`);
    expect(otherUser.status).toBe(200);

    // Admin should bypass rate limiting completely
    const adminResponses = await Promise.all(
      Array(10)
        .fill(null)
        .map(() =>
          request(server)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${adminToken}`),
        ),
    );

    adminResponses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('applies correct limits to regular authenticated users', async () => {
      await sleep();

      const userToken = await login(userKeypair);

      // User limit is 3 requests in 2 seconds
      const first = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      const second = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      const third = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(third.status).toBe(200);

      // Fourth request should be blocked
      const blocked = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(blocked.status).toBe(429);
    });

    it('applies separate limits to different users', async () => {
      await sleep();

      const userToken1 = await login(userKeypair);
      const userToken2 = await login(secondUserKeypair);

      // Both users can make their own requests independently
      const user1First = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken1}`);
      const user2First = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken2}`);

      expect(user1First.status).toBe(200);
      expect(user2First.status).toBe(200);

      // Each user has their own limit counter
      const user1Second = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken1}`);
      const user2Second = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken2}`);

      expect(user1Second.status).toBe(200);
      expect(user2Second.status).toBe(200);
    });

    it('enforces anonymous user limits based on IP', async () => {
      await sleep();

      // Anonymous requests are rate limited to 2 per 2 seconds
      const first = await request(server).get('/');
      const second = await request(server).get('/');

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      // Third anonymous request should be blocked
      const blocked = await request(server).get('/');

      expect(blocked.status).toBe(429);
    });

    it('respects admin bypass regardless of rate', async () => {
      await sleep();

      const adminToken = await login(adminKeypair);

      // Admins should bypass rate limiting completely
      const responses = await Promise.all(
        Array(10)
          .fill(null)
          .map(() =>
            request(server)
              .get('/auth/profile')
              .set('Authorization', `Bearer ${adminToken}`),
          ),
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('includes Retry-After header for rate-limited responses', async () => {
      await sleep();

      const userToken = await login(userKeypair);

      // Make requests up to the limit
      await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);
      await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      // Hit the rate limit
      const blocked = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(blocked.status).toBe(429);
      expect(blocked.headers['retry-after']).toBeDefined();
      expect(parseInt(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });
  });
});
