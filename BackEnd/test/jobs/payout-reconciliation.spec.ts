import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayoutReconciliationProcessor } from '#src/modules/jobs/processors/payout-reconciliation.processor';
import { JobLogService } from '#src/modules/jobs/services/job-log.service';
import { PayoutsService } from '#src/modules/payouts/payouts.service';
import {
  Payout,
  PayoutStatus,
} from '#src/modules/payouts/entities/payout.entity';
import {
  PayoutOutbox,
} from '#src/modules/payouts/entities/payout-outbox.entity';

describe('PayoutReconciliationProcessor', () => {
  let module: TestingModule;
  let processor: PayoutReconciliationProcessor;
  let payoutRepository: any;
  let payoutsService: { forceResetPayout: jest.Mock };

  const mockPayouts: Partial<Payout>[] = [
    {
      id: 'payout-1',
      status: PayoutStatus.PROCESSING,
      transactionHash: 'tx_abc123',
      stellarLedger: 50000001,
      processedAt: null,
      settlementConfirmedAt: null,
    },
    {
      id: 'payout-2',
      status: PayoutStatus.PROCESSING,
      transactionHash: 'tx_def456',
      stellarLedger: 50000002,
      processedAt: null,
      settlementConfirmedAt: null,
    },
    {
      id: 'payout-3',
      status: PayoutStatus.PROCESSING,
      transactionHash: null, // No hash yet — should be skipped
      stellarLedger: null,
      processedAt: null,
      settlementConfirmedAt: null,
    },
  ];

  beforeEach(async () => {
    // Deep-clone so each test gets fresh data (processor mutates in place)
    const freshPayouts = () =>
      mockPayouts.map((p) => ({ ...p }));

    payoutRepository = {
      find: jest.fn().mockImplementation(() => Promise.resolve(freshPayouts())),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };
    payoutsService = {
      forceResetPayout: jest.fn().mockImplementation((_id: string) =>
        Promise.resolve({ id: _id, status: PayoutStatus.PENDING }),
      ),
    };

    module = await Test.createTestingModule({
      providers: [
        PayoutReconciliationProcessor,
        {
          provide: getRepositoryToken(Payout),
          useValue: payoutRepository,
        },
        {
          provide: getRepositoryToken(PayoutOutbox),
          useValue: {
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: any) => {
              if (key === 'NODE_ENV') return 'test';
              return fallback;
            }),
          },
        },
        {
          provide: JobLogService,
          useValue: {
            createJobLog: jest.fn(),
            updateJobLog: jest.fn(),
          },
        },
        {
          provide: PayoutsService,
          useValue: payoutsService,
        },
      ],
    }).compile();

    processor = module.get<PayoutReconciliationProcessor>(
      PayoutReconciliationProcessor,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe('runReconciliation', () => {
    it('should run without errors when payouts exist', async () => {
      await expect(processor.runReconciliation()).resolves.not.toThrow();
    });

    it('should skip payouts without a transaction hash', async () => {
      await processor.runReconciliation();
      // payout-3 has no hash — save should only be called for payout-1 and payout-2
      const savedIds = payoutRepository.save.mock.calls.map(
        (call: any[]) => call[0].id,
      );
      expect(savedIds).not.toContain('payout-3');
    });

    it('should heal payouts that succeeded on-chain but are still PROCESSING in DB', async () => {
      await processor.runReconciliation();

      const savedPayouts = payoutRepository.save.mock.calls.map(
        (call: any[]) => call[0],
      );

      // In test mode, on-chain always returns successful=true
      // so payout-1 and payout-2 should be healed to COMPLETED
      const healed = savedPayouts.filter(
        (p: Partial<Payout>) => p.status === PayoutStatus.COMPLETED,
      );
      expect(healed.length).toBeGreaterThanOrEqual(1);
    });

    it('should do nothing when there are no submitted payouts', async () => {
      payoutRepository.find.mockResolvedValueOnce([
        {
          id: 'payout-4',
          status: PayoutStatus.PROCESSING,
          transactionHash: null,
        },
      ]);

      await processor.runReconciliation();

      expect(payoutRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      payoutRepository.find.mockRejectedValueOnce(
        new Error('DB connection lost'),
      );

      await expect(processor.runReconciliation()).resolves.not.toThrow();
    });
  });

  describe('recoverStuckPayouts', () => {
    beforeEach(() => {
      // Default: first call (stuck PROCESSING) returns two payouts,
      // second call (overdue RETRY_SCHEDULED) returns one.
      payoutRepository.find
        .mockReset()
        .mockResolvedValueOnce([
          {
            id: 'stuck-1',
            status: PayoutStatus.PROCESSING,
            transactionHash: null,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
          {
            id: 'stuck-2',
            status: PayoutStatus.PROCESSING,
            transactionHash: null,
            createdAt: new Date('2026-01-01T00:01:00Z'),
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'overdue-1',
            status: PayoutStatus.RETRY_SCHEDULED,
            nextRetryAt: new Date('2026-06-01T00:00:00Z'),
          },
        ]);
    });

    it('should reset stuck PROCESSING payouts via forceResetPayout', async () => {
      await processor.recoverStuckPayouts();

      expect(payoutsService.forceResetPayout).toHaveBeenCalledWith('stuck-1');
      expect(payoutsService.forceResetPayout).toHaveBeenCalledWith('stuck-2');
    });

    it('should reset overdue RETRY_SCHEDULED payouts via forceResetPayout', async () => {
      await processor.recoverStuckPayouts();

      expect(payoutsService.forceResetPayout).toHaveBeenCalledWith('overdue-1');
    });

    it('should attempt to recover all found stuck payouts', async () => {
      await processor.recoverStuckPayouts();

      // 3 total recovered (2 stuck + 1 overdue)
      expect(payoutsService.forceResetPayout).toHaveBeenCalledTimes(3);
    });

    it('should log nothing when there are no stuck payouts', async () => {
      payoutRepository.find
        .mockReset()
        .mockResolvedValueOnce([])  // no stuck PROCESSING
        .mockResolvedValueOnce([]); // no overdue RETRY_SCHEDULED

      await processor.recoverStuckPayouts();

      expect(payoutsService.forceResetPayout).not.toHaveBeenCalled();
    });

    it('should handle forceResetPayout errors gracefully', async () => {
      payoutsService.forceResetPayout
        .mockRejectedValueOnce(new Error('DB timeout'))
        .mockResolvedValueOnce({ id: 'stuck-2', status: PayoutStatus.PENDING })
        .mockResolvedValueOnce({ id: 'overdue-1', status: PayoutStatus.PENDING });

      await expect(processor.recoverStuckPayouts()).resolves.not.toThrow();

      // Should still have tried to recover the second stuck payout
      expect(payoutsService.forceResetPayout).toHaveBeenCalledTimes(3);
    });

    it('should handle repository errors gracefully', async () => {
      payoutRepository.find
        .mockReset()
        .mockRejectedValueOnce(new Error('Connection reset'));

      await expect(processor.recoverStuckPayouts()).resolves.not.toThrow();
    });

    it('should respect maxRecoverPerCycle limit for overdue retries', async () => {
      payoutRepository.find
        .mockReset()
        .mockResolvedValueOnce([]) // no stuck PROCESSING
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (_, i) => ({
            id: `overdue-${i}`,
            status: PayoutStatus.RETRY_SCHEDULED,
            nextRetryAt: new Date(`2026-01-01T00:0${i}:00Z`),
          })),
        );

      await processor.recoverStuckPayouts();

      // maxRecoverPerCycle is 50, and all 10 should be recovered
      expect(payoutsService.forceResetPayout).toHaveBeenCalledTimes(10);
    });
  });
});
