import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayoutReconciliationProcessor } from '../../src/modules/jobs/processors/payout-reconciliation.processor';
import { JobLogService } from '../../src/modules/jobs/services/job-log.service';
import { Payout, PayoutStatus } from '../../src/modules/payouts/entities/payout.entity';

describe('PayoutReconciliationProcessor', () => {
  let module: TestingModule;
  let processor: PayoutReconciliationProcessor;
  let payoutRepository: any;

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
    payoutRepository = {
      find: jest.fn().mockResolvedValue(mockPayouts),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    module = await Test.createTestingModule({
      providers: [
        PayoutReconciliationProcessor,
        {
          provide: getRepositoryToken(Payout),
          useValue: payoutRepository,
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
        { id: 'payout-4', status: PayoutStatus.PROCESSING, transactionHash: null },
      ]);

      await processor.runReconciliation();

      expect(payoutRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      payoutRepository.find.mockRejectedValueOnce(new Error('DB connection lost'));

      await expect(processor.runReconciliation()).resolves.not.toThrow();
    });
  });
});