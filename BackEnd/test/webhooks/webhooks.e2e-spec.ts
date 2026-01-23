import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { WebhooksModule } from '../../src/modules/webhooks/webhooks.module';
import { generateWebhookSignature } from '../../src/modules/webhooks/utils/signature';

describe('WebhooksController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WebhooksModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/webhooks/github (POST)', () => {
    const githubSecret = 'test_github_secret_12345';
    process.env.GITHUB_WEBHOOK_SECRET = githubSecret;

    it('should process valid GitHub push event', () => {
      const payload = {
        ref: 'refs/heads/main',
        repository: {
          full_name: 'test/repo',
        },
        sender: {
          login: 'testuser',
        },
        commits: [{ id: 'abc123' }],
      };

      const signature = generateWebhookSignature(payload, githubSecret, 'github');

      return request(app.getHttpServer())
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'push')
        .set('X-GitHub-Delivery', 'test-delivery-id')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.eventId).toBe('test-delivery-id');
          expect(res.body.data.eventType).toBe('push');
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should reject invalid GitHub signature', () => {
      const payload = { test: 'data' };
      const invalidSignature = 'sha256=invalid_signature';

      return request(app.getHttpServer())
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'push')
        .set('X-GitHub-Delivery', 'test-delivery-id')
        .set('X-Hub-Signature-256', invalidSignature)
        .send(payload)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid webhook signature');
        });
    });

    it('should handle GitHub pull request event', () => {
      const payload = {
        action: 'closed',
        pull_request: {
          number: 123,
          merged: true,
          user: {
            login: 'contributor',
          },
        },
        repository: {
          full_name: 'test/repo',
        },
      };

      const signature = generateWebhookSignature(payload, githubSecret, 'github');

      return request(app.getHttpServer())
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-GitHub-Delivery', 'pr-test-id')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.eventType).toBe('pull_request_closed');
          expect(res.body.data.merged).toBe(true);
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should handle GitHub issues event', () => {
      const payload = {
        action: 'closed',
        issue: {
          number: 456,
          user: {
            login: 'reporter',
          },
        },
        repository: {
          full_name: 'test/repo',
        },
      };

      const signature = generateWebhookSignature(payload, githubSecret, 'github');

      return request(app.getHttpServer())
        .post('/webhooks/github')
        .set('X-GitHub-Event', 'issues')
        .set('X-GitHub-Delivery', 'issue-test-id')
        .set('X-Hub-Signature-256', signature)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.eventType).toBe('issues');
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should reject missing required headers', () => {
      return request(app.getHttpServer())
        .post('/webhooks/github')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Missing X-GitHub-Event header');
        });
    });
  });

  describe('/webhooks/api-verify (POST)', () => {
    const apiSecret = 'test_api_secret_67890';
    process.env.API_WEBHOOK_SECRET = apiSecret;

    it('should process valid API verification event', () => {
      const payload = {
        submissionId: 'sub_123',
        userId: 'user_456',
        verificationType: 'code_review',
        externalId: 'ext_789',
      };

      const signature = generateWebhookSignature(payload, apiSecret, 'api');

      return request(app.getHttpServer())
        .post('/webhooks/api-verify')
        .set('X-Event-Type', 'submission_verify')
        .set('X-Webhook-ID', 'api-test-id')
        .set('Authorization', `Bearer ${signature}`)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.eventId).toBe('api-test-id');
          expect(res.body.data.eventType).toBe('submission_verify');
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should reject invalid API signature', () => {
      const payload = { test: 'data' };
      
      return request(app.getHttpServer())
        .post('/webhooks/api-verify')
        .set('X-Event-Type', 'test_event')
        .set('X-Webhook-ID', 'test-id')
        .set('Authorization', 'Bearer invalid_signature')
        .send(payload)
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid webhook signature');
        });
    });

    it('should handle auto-approval event', () => {
      const payload = {
        entityId: 'entity_123',
        entityType: 'submission',
        criteriaMet: ['code_quality', 'tests_passed'],
      };

      const signature = generateWebhookSignature(payload, apiSecret, 'api');

      return request(app.getHttpServer())
        .post('/webhooks/api-verify')
        .set('X-Event-Type', 'auto_approve')
        .set('X-Webhook-ID', 'auto-approve-id')
        .set('Authorization', `Bearer ${signature}`)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.eventType).toBe('auto_approve');
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should handle external validation event', () => {
      const payload = {
        serviceName: 'code_scanner',
        validationId: 'scan_123',
        result: 'success',
        metadata: {
          scan_time: '2024-01-01T00:00:00Z',
          findings: [],
        },
      };

      const signature = generateWebhookSignature(payload, apiSecret, 'api');

      return request(app.getHttpServer())
        .post('/webhooks/api-verify')
        .set('X-Event-Type', 'external_validation')
        .set('X-Webhook-ID', 'validation-id')
        .set('Authorization', `Bearer ${signature}`)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.isValid).toBe(true);
          expect(res.body.data.approved).toBe(true);
        });
    });

    it('should reject missing event type header', () => {
      return request(app.getHttpServer())
        .post('/webhooks/api-verify')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Missing X-Event-Type header');
        });
    });
  });

  describe('/webhooks/health (POST)', () => {
    it('should return health check status', () => {
      return request(app.getHttpServer())
        .post('/webhooks/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Webhook Signature Utility', () => {
    it('should generate and verify GitHub signatures correctly', () => {
      const payload = { test: 'data' };
      const secret = 'test_secret';
      
      const signature = generateWebhookSignature(payload, secret, 'github');
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate and verify API signatures correctly', () => {
      const payload = { test: 'data' };
      const secret = 'test_secret';
      
      const signature = generateWebhookSignature(payload, secret, 'api');
      expect(signature).toMatch(/^hmac-sha256=[a-f0-9]{64}$/);
    });

    it('should validate webhook secrets', () => {
      const { validateWebhookSecret } = require('../../src/modules/webhooks/utils/signature');
      
      expect(validateWebhookSecret('short')).toBe(false);
      expect(validateWebhookSecret('this_is_a_valid_secret_key')).toBe(true);
      expect(validateWebhookSecret('')).toBe(false);
    });
  });
});