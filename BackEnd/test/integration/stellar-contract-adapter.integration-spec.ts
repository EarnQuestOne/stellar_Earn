import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TracingService } from '../../src/common/tracing/tracing.service';
import { MetricsService } from '../../src/common/services/metrics.service';
import { QuestStateReconciliationProcessor } from '../../src/modules/jobs/processors/quest-state-reconciliation.processor';
import { JobLogService } from '../../src/modules/jobs/services/job-log.service';
import { JobStatus, JobType } from '../../src/modules/jobs/job.types';
import { Quest } from '../../src/modules/quests/entities/quest.entity';
import { Submission } from '../../src/modules/submissions/entities/submission.entity';
import { Payout } from '../../src/modules/payouts/entities/payout.entity';
import { EventStore } from '../../src/events/entities/event-store.entity';
import { SorobanQuestReaderService } from '../../src/modules/stellar/soroban-quest-reader.service';

describe('Stellar contract adapter integration', () => {
  let module: TestingModule;
  let processor: QuestStateReconciliationProcessor;
  let questReader: SorobanQuestReaderService;
  let questRepository: { find: jest.Mock };
  let jobLogService: {
    createJobLog: jest.Mock;
    recordJobStart: jest.Mock;
    updateJobProgress: jest.Mock;
    updateJobLog: jest.Mock;
  };
  let contractId: string;

  beforeEach(async () => {
    contractId = 'C0000000000000000000000000000000000000000000000000000000000';

    questRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'quest-1',
          contractTaskId: 'QUEST_1',
          creatorAddress: 'GCREATOR',
          rewardAsset: 'CREWARD',
          rewardAmount: 100,
          deadline: new Date('2030-01-01T00:00:00.000Z'),
          status: 'ACTIVE',
          currentCompletions: 7,
          updatedAt: new Date(),
        } as Partial<Quest>,
      ]),
    };

    jobLogService = {
      createJobLog: jest.fn().mockResolvedValue({ id: 'job-1' }),
      recordJobStart: jest.fn(),
      updateJobProgress: jest.fn(),
      updateJobLog: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        QuestStateReconciliationProcessor,
        {
          provide: TracingService,
          useValue: {
            extractContext: jest.fn(),
            startSpan: jest.fn(),
            endSpan: jest.fn(),
            inject: jest.fn(),
            trace: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            registerCounter: jest.fn(),
            registerGauge: jest.fn(),
            registerHistogram: jest.fn(),
            increment: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
            getMetrics: jest.fn(),
            getMetricsJson: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CONTRACT_ID') return contractId;
              if (key === 'QUEST_STATE_RECONCILIATION_ENABLED') return 'true';
              if (key === 'QUEST_STATE_RECONCILIATION_BATCH_SIZE') return '10';
              if (key === 'SOROBAN_RPC_URL')
                return 'https://soroban-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              if (key === 'SOROBAN_SIM_SOURCE_ACCOUNT')
                return 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
              return undefined;
            }),
          },
        },
        { provide: JobLogService, useValue: jobLogService },
        { provide: getRepositoryToken(Quest), useValue: questRepository },
        {
          provide: getRepositoryToken(Submission),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Payout),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(EventStore),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        SorobanQuestReaderService,
      ],
    }).compile();

    processor = module.get(QuestStateReconciliationProcessor);
    questReader = module.get(SorobanQuestReaderService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('reconciles a quest against simulated on-chain state', async () => {
    jest.spyOn(questReader, 'getQuest').mockResolvedValue({
      id: 'QUEST_1',
      creator: 'GCREATOR',
      reward_asset: 'CREWARD',
      reward_amount: 100n,
      verifier: 'GVERIFY',
      deadline: 1893456000n,
      status: 'Active',
      total_claims: 7,
    });

    await processor.runReconciliation();

    expect(questReader.getQuest).toHaveBeenCalledWith(contractId, 'QUEST_1');
    expect(jobLogService.createJobLog).toHaveBeenCalledWith(
      expect.objectContaining({
        jobType: JobType.QUEST_STATE_RECONCILE,
        status: JobStatus.PENDING,
      }),
    );
    expect(jobLogService.updateJobLog).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: JobStatus.COMPLETED,
        result: expect.objectContaining({
          checked: 1,
          discrepanciesCount: 0,
        }),
      }),
    );
  });

  it('captures contract mismatches from on-chain state', async () => {
    jest.spyOn(questReader, 'getQuest').mockResolvedValue({
      id: 'QUEST_1',
      creator: 'GDIFFERENT',
      reward_asset: 'CREWARD',
      reward_amount: 250n,
      verifier: 'GVERIFY',
      deadline: 1893456000n,
      status: 'Paused',
      total_claims: 7,
    });

    await processor.runReconciliation();

    expect(questReader.getQuest).toHaveBeenCalledWith(contractId, 'QUEST_1');
    expect(jobLogService.updateJobLog).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({
        status: JobStatus.COMPLETED,
        result: expect.objectContaining({
          discrepanciesCount: 3,
        }),
      }),
    );
  });
});
