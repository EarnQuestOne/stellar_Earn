import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { join } from 'path';
import { QuotaService } from '#src/modules/quota/quota.service';
import { QuotaConfig } from '#src/modules/quota/entities/quota-config.entity';
import {
  QuotaUsage,
  QuotaResourceType,
} from '#src/modules/quota/entities/quota-usage.entity';
import { CacheService } from '#src/modules/cache/cache.service';

describe('Quota usage concurrency (#1904)', () => {
  let module: TestingModule;
  let quotaService: QuotaService;
  let configRepo: Repository<QuotaConfig>;
  let usageRepo: Repository<QuotaUsage>;
  let dataSource: DataSource;

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
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await module.close();
  });

  const seedConfig = async (tenantId: string) =>
    configRepo.save({
      tenantId,
      maxQuestsPerPeriod: 100,
      maxPayoutAmountPerPeriod: 1_000_000,
      maxSinglePayoutAmount: null,
      periodSeconds: 86400,
    });

  it('creates a unique DB index on (tenantId, resourceType, periodStart)', async () => {
    const indexes = (await dataSource.query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'quota_usages'`,
    )) as Array<{ indexdef: string }>;

    const uniqueIndex = indexes.find((row) =>
      row.indexdef.includes('UQ_quota_usages_tenant_resource_period'),
    );
    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex.indexdef).toContain('"tenantId"');
    expect(uniqueIndex.indexdef).toContain('"resourceType"');
    expect(uniqueIndex.indexdef).toContain('"periodStart"');
  });

  it('creates a single usage row for parallel first-time requests', async () => {
    const tenantId = 'TENANT_PARALLEL';
    await seedConfig(tenantId);

    const N = 10;
    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        quotaService.enforceQuestCreationQuota(tenantId),
      ),
    );

    const rejected = results.filter((result) => result.status === 'rejected');
    expect(rejected).toHaveLength(0);

    const rows = await usageRepo.find({
      where: { tenantId, resourceType: QuotaResourceType.QUEST },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].questCount).toBe(N);
  });

  it('reuses the existing row for sequential requests (upsert semantics)', async () => {
    const tenantId = 'TENANT_SEQUENTIAL';
    await seedConfig(tenantId);

    await quotaService.enforceQuestCreationQuota(tenantId);
    await quotaService.enforceQuestCreationQuota(tenantId);

    const rows = await usageRepo.find({
      where: { tenantId, resourceType: QuotaResourceType.QUEST },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].questCount).toBe(2);
  });
});
