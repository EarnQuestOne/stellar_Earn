import { INestApplication, Controller, Post, HttpCode } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard, Throttle } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

/**
 * Minimal controller that mirrors the webhook rate-limit config.
 * Uses a small limit (3 per 60s) so the test is fast.
 */
@Controller('webhooks')
@Throttle({ default: { limit: 3, ttl: 60000 } })
class StubWebhookController {
  @Post('github')
  @HttpCode(200)
  handle() {
    return { success: true };
  }
}

describe('Webhook Rate Limiting', () => {
  let app: INestApplication<App>;
  let server: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
      ],
      controllers: [StubWebhookController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows requests within the webhook rate limit', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(server).post('/webhooks/github').send({});
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 once the webhook rate limit is exceeded', async () => {
    const res = await request(server).post('/webhooks/github').send({});
    expect(res.status).toBe(429);
  });

  it('includes Retry-After header on 429 responses', async () => {
    const res = await request(server).post('/webhooks/github').send({});
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });
});
