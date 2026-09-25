import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '#src/common/logger/logger.module';
import { PrivacyModule } from '#src/modules/privacy/privacy.module';
import { ErasureService } from '#src/modules/privacy/erasure.service';
import {
  ErasureRequest,
  ErasureStatus,
} from '#src/modules/privacy/entities/erasure-request.entity';
import { User } from '#src/modules/users/entities/user.entity';
import { Submission } from '#src/modules/submissions/entities/submission.entity';
import { Notification } from '#src/modules/notifications/entities/notification.entity';
import { Payout } from '#src/modules/payouts/entities/payout.entity';
import { ModerationItem } from '#src/modules/moderation/entities/moderation-item.entity';
import { EventStore } from '#src/events/entities/event-store.entity';
import { DataSource, Repository } from 'typeorm';
import { Quest } from '#src/modules/quests/entities/quest.entity';

describe('Privacy Erasure Integration', () => {
  let module: TestingModule;
  let erasureService: ErasureService;
  let dataSource: DataSource;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    // Short grace period so execution can run within the test without waiting
    // a week; the pipeline reads it once per request creation.
    process.env.ERASURE_GRACE_PERIOD_MS = '100';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        LoggerModule.forRoot({
          enableInterceptor: false,
          enableErrorFilter: false,
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_DATABASE || 'stellar_earn_test_integration',
          entities: [
            ErasureRequest,
            User,
            Submission,
            Notification,
            Payout,
            ModerationItem,
            EventStore,
            Quest,
          ],
          autoLoadEntities: true,
          synchronize: false,
          dropSchema: true,
          migrationsRun: true,
          migrations: [
            join(__dirname, '../../src/database/migrations/*.{ts,js}'),
          ],
        }),
        PrivacyModule,
      ],
    }).compile();

    erasureService = module.get<ErasureService>(ErasureService);
    dataSource = module.get<DataSource>(DataSource);
    userRepo = dataSource.getRepository(User);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE "erasure_requests", "users", "submissions", "notifications", "payouts", "moderation_items", "event_store", "quests" RESTART IDENTITY CASCADE',
    );
  });

  async function seedSubject(): Promise<User> {
    return userRepo.save({
      stellarAddress: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMN',
      username: 'eraseme',
      email: 'eraseme@example.com',
      bio: 'private bio',
      socialLinks: { twitter: '@eraseme' },
      role: 'USER',
    } as Partial<User>);
  }

  describe('request lifecycle', () => {
    it('creates a request with a future scheduledFor and persists it', async () => {
      const user = await seedSubject();

      const request = await erasureService.requestErasure(user.id, {
        requestedBy: user.id,
      });

      expect(request.status).toBe(ErasureStatus.REQUESTED);
      expect(request.scheduledFor.getTime()).toBeGreaterThan(Date.now());
      expect(request.subjectId).toBe(user.id);

      const persisted = await dataSource
        .getRepository(ErasureRequest)
        .findOneByOrFail({ id: request.id });
      expect(persisted.status).toBe(ErasureStatus.REQUESTED);
    });

    it('cancels within the grace window and never executes', async () => {
      const user = await seedSubject();
      const request = await erasureService.requestErasure(user.id, {
        requestedBy: user.id,
      });

      const cancelled = await erasureService.cancelErasure(request.id, {
        id: user.id,
        role: 'USER',
      });
      expect(cancelled.status).toBe(ErasureStatus.CANCELLED);
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);

      // Execution must skip cancelled requests.
      const result = await erasureService.executeErasure(request.id);
      expect(result.skipped).toBe(true);

      const after = await dataSource
        .getRepository(ErasureRequest)
        .findOneByOrFail({ id: request.id });
      expect(after.status).toBe(ErasureStatus.CANCELLED);
      expect(after.executedAt).toBeNull();
    });
  });

  describe('cross-module anonymization', () => {
    it('anonymizes PII across modules in one transaction, retaining FKs', async () => {
      const user = await seedSubject();
      const quest = await dataSource.getRepository(Quest).save({
        title: 'Quest with proof',
        description: 'do the thing',
        contractTaskId: 'task-1',
        rewardAsset: 'XLM',
        rewardAmount: 100,
        verifierType: 'MANUAL',
        verifierConfig: { verifiers: [] },
        status: 'ACTIVE',
        createdBy: user.id,
      } as Partial<Quest>);

      // Submission with submitter PII in the proof payload.
      await dataSource.getRepository(Submission).save({
        questId: quest.id,
        userId: user.id,
        proof: {
          tweetUrl: 'https://x.com/eraseme/status/1',
          email: 'eraseme@example.com',
        },
        status: 'APPROVED',
        approvedBy: 'VERIFIER-ADDRESS',
        approvedAt: new Date(),
      } as Partial<Submission>);

      // Notification row for the subject.
      await dataSource.getRepository(Notification).save({
        userId: user.id,
        type: 'INFO',
        title: 'Welcome',
        message: 'hello eraseme',
        priority: 'NORMAL',
      } as Partial<Notification>);

      // Payout retained for compliance — de-identified on erasure.
      await dataSource.getRepository(Payout).save({
        stellarAddress: user.stellarAddress!,
        amount: 50,
        asset: 'XLM',
        status: 'PAID',
        type: 'REWARD',
        questId: quest.id,
      } as Partial<Payout>);

      // Moderation record with a snapshot of submitter content.
      await dataSource.getRepository(ModerationItem).save({
        targetType: 'SUBMISSION',
        targetId: 'target-1',
        userId: user.id,
        textSnapshot: 'eraseme content',
        imageUrls: ['https://cdn.example.com/eraseme.png'],
        notes: 'reviewer note',
        status: 'RESOLVED',
      } as Partial<ModerationItem>);

      // Request erasure and let the grace period elapse.
      const request = await erasureService.requestErasure(user.id, {
        requestedBy: user.id,
      });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await erasureService.executeErasure(request.id);
      expect(result.status).toBe(ErasureStatus.COMPLETED);

      // ── Referential-integrity assertions ─────────────────────────────────
      const afterUser = await dataSource
        .getRepository(User)
        .findOneByOrFail({ id: user.id });
      expect(afterUser.email).toMatch(/^erased:.*@erased\.invalid$/);
      expect(afterUser.stellarAddress).toBe(`erased:${user.id}`);
      expect(afterUser.username).toBeNull();
      expect(afterUser.bio).toBeNull();
      expect(afterUser.socialLinks).toBeNull();

      // Submission row survives (quest integrity + reviewer decisions kept),
      // but the proof payload is detached.
      const submissions = await dataSource
        .getRepository(Submission)
        .findBy({ userId: user.id });
      expect(submissions).toHaveLength(1);
      expect(submissions[0].proof).toEqual({ erased: true });
      expect(submissions[0].status).toBe('APPROVED');
      expect(submissions[0].approvedBy).toBe('VERIFIER-ADDRESS');
      expect(submissions[0].questId).toBe(quest.id);

      // Notifications are deleted.
      const notifications = await dataSource
        .getRepository(Notification)
        .findBy({ userId: user.id });
      expect(notifications).toHaveLength(0);

      // Payouts retained but de-identified.
      const payouts = await dataSource.getRepository(Payout).find();
      expect(payouts).toHaveLength(1);
      expect(payouts[0].stellarAddress).toBe(`erased:${user.id}`);
      expect(payouts[0].amount).toBe(50);

      // Moderation record retained, PII detached.
      const moderation = await dataSource
        .getRepository(ModerationItem)
        .findBy({ userId: user.id });
      expect(moderation).toHaveLength(1);
      expect(moderation[0].textSnapshot).toBeNull();
      expect(moderation[0].imageUrls).toBeNull();
      expect(moderation[0].notes).toBeNull();

      // Audit record of the erasure written.
      const audits = await dataSource
        .getRepository(EventStore)
        .findBy({ eventName: 'privacy.erasure.executed' });
      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(audits[0].sourceId).toBe(request.id);

      // Request marked completed; re-run is a no-op (idempotent).
      const afterRequest = await dataSource
        .getRepository(ErasureRequest)
        .findOneByOrFail({ id: request.id });
      expect(afterRequest.status).toBe(ErasureStatus.COMPLETED);
      expect(afterRequest.executedAt).toBeInstanceOf(Date);

      const rerun = await erasureService.executeErasure(request.id);
      expect(rerun.alreadyExecuted).toBe(true);
    });
  });
});
