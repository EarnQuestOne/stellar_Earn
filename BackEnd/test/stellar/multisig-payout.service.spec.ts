import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import fc from 'fast-check';
import { MultiSigPayoutService } from 'src/modules/stellar/multisig/services/multisig-payout.service';
import { MultiSigWalletService } from 'src/modules/stellar/multisig/services/multisig-wallet.service';
import { MultiSigTransaction, MultiSigTransactionStatus } from 'src/modules/stellar/multisig/entities/multisig-transaction.entity';
import { MultiSigWallet, MultiSigWalletStatus } from 'src/modules/stellar/multisig/entities/multisig-wallet.entity';
import { Payout, PayoutStatus, PayoutType } from 'src/modules/payouts/entities/payout.entity';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Any payout status that is NOT PENDING */
const nonPendingPayoutStatus = fc.constantFrom(
  PayoutStatus.AWAITING_APPROVAL,
  PayoutStatus.PROCESSING,
  PayoutStatus.COMPLETED,
  PayoutStatus.FAILED,
  PayoutStatus.RETRY_SCHEDULED,
);

/** Any transaction status that is NOT APPROVED */
const nonApprovedTransactionStatus = fc.constantFrom(
  MultiSigTransactionStatus.PENDING,
  MultiSigTransactionStatus.REJECTED,
  MultiSigTransactionStatus.CANCELLED,
  MultiSigTransactionStatus.EXECUTING,
  MultiSigTransactionStatus.COMPLETED,
  MultiSigTransactionStatus.FAILED,
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makePayout = (overrides: Partial<Payout> = {}): Payout =>
  ({
    id: 'payout-123',
    stellarAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
    amount: 500,
    asset: 'XLM',
    status: PayoutStatus.PENDING,
    type: PayoutType.QUEST_REWARD,
    questId: 'quest-1',
    submissionId: 'sub-1',
    transactionHash: null,
    stellarLedger: null,
    failureReason: null,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    processedAt: null,
    claimedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    canRetry: () => false,
    isClaimable: () => true,
    ...overrides,
  } as Payout);

const makeTransaction = (overrides: Partial<MultiSigTransaction> = {}): MultiSigTransaction =>
  ({
    id: 'tx-123',
    multiSigWalletId: 'wallet-123',
    transactionType: 'PAYOUT' as any,
    status: MultiSigTransactionStatus.APPROVED,
    destinationAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
    amount: 500,
    asset: 'XLM',
    transactionPayload: JSON.stringify({ payoutId: 'payout-123', questId: 'quest-1', submissionId: 'sub-1' }),
    description: 'Test payout',
    approvalsReceived: 2,
    rejectionsReceived: 0,
    threshold: 2,
    initiatedBy: 'user-1',
    lastModifiedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
    stellarTransactionHash: null,
    stellarLedger: null,
    failureReason: null,
    completedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    ...overrides,
  } as MultiSigTransaction);

const makeWallet = (overrides: Partial<MultiSigWallet> = {}): MultiSigWallet =>
  ({
    id: 'wallet-123',
    organizationId: 'org-1',
    walletAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
    name: 'Test Wallet',
    description: null,
    threshold: 2,
    totalSigners: 3,
    status: MultiSigWalletStatus.ACTIVE,
    totalTransactions: 0,
    approvedTransactions: 0,
    totalAmountApproved: 0,
    createdBy: 'user-1',
    lastModifiedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
    ...overrides,
  } as MultiSigWallet);

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('MultiSigPayoutService', () => {
  let service: MultiSigPayoutService;
  let mockPayoutRepo: any;
  let mockTransactionRepo: any;
  let mockWalletRepo: any;
  let mockMultiSigWalletService: any;
  let mockEventEmitter: any;

  beforeEach(async () => {
    mockPayoutRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockTransactionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockWalletRepo = {
      findOne: jest.fn(),
    };

    mockMultiSigWalletService = {
      createTransaction: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiSigPayoutService,
        {
          provide: getRepositoryToken(Payout),
          useValue: mockPayoutRepo,
        },
        {
          provide: getRepositoryToken(MultiSigTransaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(MultiSigWallet),
          useValue: mockWalletRepo,
        },
        {
          provide: MultiSigWalletService,
          useValue: mockMultiSigWalletService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MultiSigPayoutService>(MultiSigPayoutService);
  });

  // ── createPayoutEscrow ────────────────────────────────────────────────────

  describe('createPayoutEscrow', () => {
    it('should create escrow, update payout to AWAITING_APPROVAL, and emit event', async () => {
      const payout = makePayout();
      const tx = makeTransaction({ status: MultiSigTransactionStatus.PENDING, approvalsReceived: 0 });

      mockPayoutRepo.findOne.mockResolvedValue(payout);
      mockMultiSigWalletService.createTransaction.mockResolvedValue(tx);
      mockPayoutRepo.save.mockResolvedValue({ ...payout, status: PayoutStatus.AWAITING_APPROVAL });

      const result = await service.createPayoutEscrow(
        'payout-123',
        'wallet-123',
        'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
        500,
        'user-1',
      );

      expect(mockMultiSigWalletService.createTransaction).toHaveBeenCalled();
      expect(mockPayoutRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PayoutStatus.AWAITING_APPROVAL }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'multisig.payout.escrow_created',
        expect.objectContaining({ payoutId: 'payout-123' }),
      );
      expect(result.payoutId).toBe('payout-123');
    });

    it('should throw NotFoundException when payout does not exist', async () => {
      mockPayoutRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPayoutEscrow('missing-payout', 'wallet-123', 'addr', 100, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    // Property 13: Non-PENDING payout rejects escrow creation
    // Feature: multisig-edge-case-testing, Property 13: Non-PENDING payout rejects escrow creation
    it('should throw BadRequestException for any non-PENDING payout status', async () => {
      await fc.assert(
        fc.asyncProperty(nonPendingPayoutStatus, async (status) => {
          jest.clearAllMocks();
          mockPayoutRepo.findOne.mockResolvedValue(makePayout({ status }));

          await expect(
            service.createPayoutEscrow('payout-123', 'wallet-123', 'addr', 100, 'user-1'),
          ).rejects.toThrow(BadRequestException);
        }),
      );
    });
  });

  // ── processApprovedPayout ─────────────────────────────────────────────────

  describe('processApprovedPayout', () => {
    it('should update payout to PROCESSING and emit event', async () => {
      const tx = makeTransaction();
      const payout = makePayout({ status: PayoutStatus.AWAITING_APPROVAL });

      mockTransactionRepo.findOne.mockResolvedValue(tx);
      mockPayoutRepo.findOne.mockResolvedValue(payout);
      mockPayoutRepo.save.mockResolvedValue({ ...payout, status: PayoutStatus.PROCESSING });

      const result = await service.processApprovedPayout('tx-123');

      expect(mockPayoutRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PayoutStatus.PROCESSING }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'multisig.payout.approved',
        expect.objectContaining({ payoutId: 'payout-123' }),
      );
      expect(result.status).toBe(PayoutStatus.PROCESSING);
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      mockTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.processApprovedPayout('missing-tx')).rejects.toThrow(NotFoundException);
    });

    // Property 14: Non-APPROVED transaction rejects payout processing
    // Feature: multisig-edge-case-testing, Property 14: Non-APPROVED transaction rejects payout processing
    it('should throw BadRequestException for any non-APPROVED transaction status', async () => {
      await fc.assert(
        fc.asyncProperty(nonApprovedTransactionStatus, async (status) => {
          jest.clearAllMocks();
          mockTransactionRepo.findOne.mockResolvedValue(makeTransaction({ status }));

          await expect(service.processApprovedPayout('tx-123')).rejects.toThrow(BadRequestException);
        }),
      );
    });
  });

  // ── handleRejectedPayout ──────────────────────────────────────────────────

  describe('handleRejectedPayout', () => {
    it('should set payout to FAILED with failureReason and emit event', async () => {
      const tx = makeTransaction({ status: MultiSigTransactionStatus.REJECTED });
      const payout = makePayout({ status: PayoutStatus.AWAITING_APPROVAL });

      mockTransactionRepo.findOne.mockResolvedValue(tx);
      mockPayoutRepo.findOne.mockResolvedValue(payout);
      mockPayoutRepo.save.mockImplementation((p: Payout) => Promise.resolve(p));

      const result = await service.handleRejectedPayout('tx-123', 'Insufficient funds');

      expect(mockPayoutRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PayoutStatus.FAILED,
          failureReason: expect.stringContaining('Insufficient funds'),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'multisig.payout.rejected',
        expect.objectContaining({ payoutId: 'payout-123', reason: 'Insufficient funds' }),
      );
      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toContain('Insufficient funds');
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      mockTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.handleRejectedPayout('missing-tx', 'reason')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPayoutApprovalDashboard ────────────────────────────────────────────

  describe('getPayoutApprovalDashboard', () => {
    it('should return dashboard with correct pending and approved counts', async () => {
      const wallet = makeWallet();
      const pendingTxs = [
        makeTransaction({ id: 'tx-1', status: MultiSigTransactionStatus.PENDING }),
        makeTransaction({ id: 'tx-2', status: MultiSigTransactionStatus.PENDING }),
      ];
      const approvedTxs = [makeTransaction({ id: 'tx-3', status: MultiSigTransactionStatus.APPROVED })];

      mockWalletRepo.findOne.mockResolvedValue(wallet);
      mockTransactionRepo.find
        .mockResolvedValueOnce(pendingTxs)
        .mockResolvedValueOnce(approvedTxs);

      const result = await service.getPayoutApprovalDashboard('wallet-123');

      expect(result.pendingCount).toBe(2);
      expect(result.approvedCount).toBe(1);
      expect(result.walletAddress).toBe(wallet.walletAddress);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.getPayoutApprovalDashboard('missing-wallet')).rejects.toThrow(NotFoundException);
    });

    // Property 12: Dashboard counts match actual transaction counts
    // Feature: multisig-edge-case-testing, Property 12: Dashboard counts match actual transaction counts
    it('should return pendingCount matching the number of pending transactions', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 8 }), async (pendingCount) => {
          jest.clearAllMocks();

          const wallet = makeWallet();
          const pendingTxs = Array.from({ length: pendingCount }, (_, i) =>
            makeTransaction({ id: `tx-pending-${i}`, status: MultiSigTransactionStatus.PENDING }),
          );

          mockWalletRepo.findOne.mockResolvedValue(wallet);
          mockTransactionRepo.find
            .mockResolvedValueOnce(pendingTxs)
            .mockResolvedValueOnce([]);

          const result = await service.getPayoutApprovalDashboard('wallet-123');

          return result.pendingCount === pendingCount;
        }),
      );
    });
  });
});
