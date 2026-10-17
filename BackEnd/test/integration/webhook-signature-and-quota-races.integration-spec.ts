import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { join } from 'path';
import {
  verifyWebhookSignature,
  generateWebhookSignature,
  validateWebhookSecret,
} from '#src/modules/webhooks/utils/signature';
import { QuotaService } from '#src/modules/quota/quota.service';
import { QuotaConfig } from '#src/modules/quota/entities/quota-config.entity';
import {
  QuotaUsage,
  QuotaResourceType,
} from '#src/modules/quota/entities/quota-usage.entity';
import { CacheService } from '#src/modules/cache/cache.service';

/**
 * Integration coverage for the two pieces of backend logic flagged as the
 * riskiest-yet-untested surface (#1914):
 *
 *   1. Webhook HMAC signature verification (valid / tampered / wrong-secret /
 *      malformed / unsupported-provider paths).
 *   2. Quota enforcement under a concurrent burst — the TOCTOU boundary where a
 *      naive read-then-write would over-grant.
 *
 * The spec is named `*.integration-spec.ts` so it is picked up automatically by
 * the existing `npm run test:integration` suite that CI runs.
 */
describe('Webhook signature verification (#1914)', () => {
  const secret = 'super-secret-webhook-key-1234567890';
  const payload = { event: 'quest.completed', questId: 'q_123', amount: '500' };

  it('accepts a valid GitHub HMAC-SHA256 signature', () => {
    const signature = generateWebhookSignature(payload, secret, 'github');
    expect(verifyWebhookSignature(payload, signature, secret, 'github')).toBe(
      true,
    );
  });

  it('rejects a GitHub signature when the payload is tampered', () => {
    const signature = generateWebhookSignature(payload, secret, 'github');
    const tampered = { ...payload, amount: '999999' };
    expect(verifyWebhookSignature(tampered, signature, secret, 'github')).toBe(
      false,
    );
  });

  it('rejects a GitHub signature signed with the wrong secret', () => {
    const signature = generateWebhookSignature(
      payload,
      'other-secret',
      'github',
    );
    expect(verifyWebhookSignature(payload, signature, secret, 'github')).toBe(
      false,
    );
  });

  it('rejects a malformed GitHub signature (missing sha256= prefix)', () => {
    expect(verifyWebhookSignature(payload, 'deadbeef', secret, 'github')).toBe(
      false,
    );
  });

  it('accepts a valid custom API signature and rejects a tampered one', () => {
    const signature = generateWebhookSignature(payload, secret, 'api');
    expect(verifyWebhookSignature(payload, signature, secret, 'api')).toBe(
      true,
    );
    expect(
      verifyWebhookSignature(
        { ...payload, amount: '1' },
        signature,
        secret,
        'api',
      ),
    ).toBe(false);
  });

  it('rejects an unsupported provider even with an otherwise valid signature', () => {
    const signature = generateWebhookSignature(payload, secret, 'github');
    expect(verifyWebhookSignature(payload, signature, secret, 'stripe')).toBe(
      false,
    );
  });

  it('enforces a minimum webhook secret strength', () => {
    expect(validateWebhookSecret('short')).toBe(false);
    expect(validateWebhookSecret(secret)).toBe(true);
  });
});

describe('Quota enforcement under concurrency (#1914)', () => {
  let module: TestingModule;
  let quotaService: QuotaService;
  let configRepo: Repository<QuotaConfig>;
  let usageRepo: Repository<QuotaUsage>;

  const mockCache = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deletePattern: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [QuotaConfig, QuotaUsage],
          synchronize: false,
          dropSchema: true,
          migrationsRun: true,
          migrations: [
            join(__dirname, '../../src/database/migrations/*.{ts,js}'),
          ],
        }),
        TypeOrmModule.forFeature([QuotaConfig, QuotaUsage]),
      ],
      providers: [QuotaService, { provide: CacheService, useValue: mockCache }],
    }).compile();

    quotaService = module.get(QuotaService);
    configRepo = module.get(getRepositoryToken(QuotaConfig));
    usageRepo = module.get(getRepositoryToken(QuotaUsage));
  });

  afterAll(async () => {
    await module.close();
  });

  it('never grants more than the configured limit under a concurrent burst', async () => {
    const tenantId = 'TENANT_BOUNDARY';
    const limit = 5;
    await configRepo.save({
      tenantId,
      maxQuestsPerPeriod: limit,
      maxPayoutAmountPerPeriod: 1_000_000,
      maxSinglePayoutAmount: null,
      periodSeconds: 86400,
    });

    const burst = 25;
    const results = await Promise.allSettled(
      Array.from({ length: burst }, () =>
        quotaService.enforceQuestCreationQuota(tenantId),
      ),
    );

    const granted = results.filter((r) => r.status === 'fulfilled').length;
    const rejected = results.filter((r) => r.status === 'rejected').length;

    // Exactly `limit` calls may succeed; the rest must be rejected.
    expect(granted).toBe(limit);
    expect(rejected).toBe(burst - limit);

    const rows = await usageRepo.find({
      where: { tenantId, resourceType: QuotaResourceType.QUEST },
    });
    expect(rows).toHaveLength(1);
    // The atomic guarded increment must never let the stored count exceed the
    // limit, even though `burst` requests raced for it.
    expect(rows[0].questCount).toBe(limit);
  });
});
