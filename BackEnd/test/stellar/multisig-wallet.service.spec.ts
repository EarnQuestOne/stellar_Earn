import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MultiSigWalletService } from 'src/modules/stellar/multisig/services/multisig-wallet.service';
import { MultiSigWallet, MultiSigWalletStatus } from 'src/modules/stellar/multisig/entities/multisig-wallet.entity';
import { MultiSigSigner, SignerRole, SignerStatus } from 'src/modules/stellar/multisig/entities/multisig-signer.entity';
import { MultiSigTransaction, MultiSigTransactionStatus, MultiSigTransactionType } from 'src/modules/stellar/multisig/entities/multisig-transaction.entity';
import { MultiSigSignature, SignatureStatus } from 'src/modules/stellar/multisig/entities/multisig-signature.entity';
import { CreateMultiSigWalletDto, ApproveTransactionDto, UpdateThresholdDto, CreateMultiSigTransactionDto, RejectTransactionDto } from 'src/modules/stellar/multisig/dto/multisig.dto';

describe('MultiSigWalletService', () => {
  let service: MultiSigWalletService;
  let mockWalletRepo: any;
  let mockSignerRepo: any;
  let mockTransactionRepo: any;
  let mockSignatureRepo: any;
  let mockEventEmitter: any;

  const testUserId = 'test-user-123';
  const testOrgId = 'org-123';
  const testWalletAddress = 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2';

  beforeEach(async () => {
    mockWalletRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockSignerRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockTransactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    mockSignatureRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiSigWalletService,
        {
          provide: getRepositoryToken(MultiSigWallet),
          useValue: mockWalletRepo,
        },
        {
          provide: getRepositoryToken(MultiSigSigner),
          useValue: mockSignerRepo,
        },
        {
          provide: getRepositoryToken(MultiSigTransaction),
          useValue: mockTransactionRepo,
        },
        {
          provide: getRepositoryToken(MultiSigSignature),
          useValue: mockSignatureRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MultiSigWalletService>(MultiSigWalletService);
  });

  describe('createWallet', () => {
    it('should create a new multi-sig wallet successfully', async () => {
      const createDto: CreateMultiSigWalletDto = {
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        name: 'Enterprise Wallet',
        description: 'High-value payout wallet',
        threshold: 2,
        totalSigners: 3,
      };

      const expectedWallet = {
        id: 'wallet-123',
        ...createDto,
        status: MultiSigWalletStatus.ACTIVE,
        totalTransactions: 0,
        approvedTransactions: 0,
        totalAmountApproved: 0,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue(null);
      mockWalletRepo.create.mockReturnValue(expectedWallet);
      mockWalletRepo.save.mockResolvedValue(expectedWallet);

      const result = await service.createWallet(createDto, testUserId);

      expect(result).toEqual(expectedWallet);
      expect(mockWalletRepo.create).toHaveBeenCalledWith({
        ...createDto,
        status: MultiSigWalletStatus.ACTIVE,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        lastActivityAt: expect.any(Date),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.wallet.created', expect.any(Object));
    });

    it('should throw error if wallet already exists', async () => {
      const createDto: CreateMultiSigWalletDto = {
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        threshold: 2,
        totalSigners: 3,
      };

      mockWalletRepo.findOne.mockResolvedValue({ id: 'existing-wallet' });

      await expect(service.createWallet(createDto, testUserId)).rejects.toThrow(
        'Multi-sig wallet already exists for this organization and address',
      );
    });

    it('should throw error if threshold exceeds total signers', async () => {
      const createDto: CreateMultiSigWalletDto = {
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        threshold: 5,
        totalSigners: 3,
      };

      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.createWallet(createDto, testUserId)).rejects.toThrow(
        'Threshold cannot exceed total signers',
      );
    });
  });

  describe('addSigner', () => {
    it('should add a new signer to wallet', async () => {
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockWallet = {
        id: 'wallet-123',
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        name: 'Test Wallet',
        threshold: 2,
        totalSigners: 3,
        status: MultiSigWalletStatus.ACTIVE,
        totalTransactions: 0,
        approvedTransactions: 0,
        totalAmountApproved: 0,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      const expectedSigner = {
        id: 'signer-123',
        multiSigWalletId: 'wallet-123',
        signerAddress,
        signerName: 'Signer 1',
        role: SignerRole.APPROVER,
        status: SignerStatus.ACTIVE,
        approvalCount: 0,
        rejectionCount: 0,
        addedBy: testUserId,
        addedAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSigner;

      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockSignerRepo.findOne.mockResolvedValue(null);
      mockSignerRepo.create.mockReturnValue(expectedSigner);
      mockSignerRepo.save.mockResolvedValue(expectedSigner);
      mockWalletRepo.save.mockResolvedValue(mockWallet);

      const result = await service.addSigner(
        {
          multiSigWalletId: 'wallet-123',
          signerAddress,
          signerName: 'Signer 1',
          role: SignerRole.APPROVER,
        },
        testUserId,
      );

      expect(result).toEqual(expectedSigner);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.signer.added', expect.any(Object));
    });

    it('should re-add a previously removed signer successfully', async () => {
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockWallet = {
        id: 'wallet-123',
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        name: 'Test Wallet',
        threshold: 2,
        totalSigners: 3,
        status: MultiSigWalletStatus.ACTIVE,
        totalTransactions: 0,
        approvedTransactions: 0,
        totalAmountApproved: 0,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      const removedSigner = {
        id: 'signer-old',
        multiSigWalletId: 'wallet-123',
        signerAddress,
        signerName: 'Signer 1',
        role: SignerRole.APPROVER,
        status: SignerStatus.REMOVED,
        approvalCount: 2,
        rejectionCount: 0,
        addedBy: testUserId,
        addedAt: new Date(),
        updatedAt: new Date(),
        removedBy: testUserId,
        removedAt: new Date(),
      } as MultiSigSigner;

      const newActiveSigner = {
        id: 'signer-new',
        multiSigWalletId: 'wallet-123',
        signerAddress,
        signerName: 'Signer 1',
        role: SignerRole.APPROVER,
        status: SignerStatus.ACTIVE,
        approvalCount: 0,
        rejectionCount: 0,
        addedBy: testUserId,
        addedAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSigner;

      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      // findOne returns the previously-removed signer
      mockSignerRepo.findOne.mockResolvedValue(removedSigner);
      mockSignerRepo.create.mockReturnValue(newActiveSigner);
      mockSignerRepo.save.mockResolvedValue(newActiveSigner);
      mockWalletRepo.save.mockResolvedValue(mockWallet);

      const result = await service.addSigner(
        {
          multiSigWalletId: 'wallet-123',
          signerAddress,
          signerName: 'Signer 1',
          role: SignerRole.APPROVER,
        },
        testUserId,
      );

      expect(result.status).toBe(SignerStatus.ACTIVE);
      expect(mockSignerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          signerAddress,
          status: SignerStatus.ACTIVE,
        }),
      );
      expect(mockSignerRepo.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.signer.added', expect.any(Object));
    });
  });

  describe('removeSigner', () => {
    it('should remove a signer and emit multisig.signer.removed event', async () => {
      const walletId = 'wallet-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockSigner = {
        id: 'signer-123',
        multiSigWalletId: walletId,
        signerAddress,
        signerName: 'Signer 1',
        role: SignerRole.APPROVER,
        status: SignerStatus.ACTIVE,
        approvalCount: 0,
        rejectionCount: 0,
        addedBy: testUserId,
        addedAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSigner;

      const mockWallet = {
        id: walletId,
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        name: 'Test Wallet',
        threshold: 2,
        totalSigners: 3,
        status: MultiSigWalletStatus.ACTIVE,
        totalTransactions: 0,
        approvedTransactions: 0,
        totalAmountApproved: 0,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      const removedSigner = {
        ...mockSigner,
        status: SignerStatus.REMOVED,
        removedBy: testUserId,
        removedAt: new Date(),
      } as MultiSigSigner;

      mockSignerRepo.findOne.mockResolvedValue(mockSigner);
      mockSignerRepo.save.mockResolvedValue(removedSigner);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockWalletRepo.save.mockResolvedValue(mockWallet);

      const result = await service.removeSigner(walletId, signerAddress, testUserId);

      expect(result.status).toBe(SignerStatus.REMOVED);
      expect(result.removedAt).toBeInstanceOf(Date);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.signer.removed', {
        walletId,
        signerAddress,
      });
    });
  });

  describe('approveTransaction', () => {
    it('should approve transaction and update signature', async () => {
      const transactionId = 'tx-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockTx = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        transactionType: MultiSigTransactionType.PAYOUT,
        status: MultiSigTransactionStatus.PENDING,
        destinationAddress: signerAddress,
        amount: 1000,
        asset: 'XLM',
        approvalsReceived: 0,
        rejectionsReceived: 0,
        threshold: 2,
        initiatedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Test payout',
        lastModifiedBy: testUserId,
      } as MultiSigTransaction;

      const mockSignature = {
        id: 'sig-123',
        multiSigTransactionId: transactionId,
        signerAddress,
        signerName: 'Signer 1',
        status: SignatureStatus.PENDING,
        comment: 'Approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSignature;

      const mockSigner = {
        id: 'signer-123',
        multiSigWalletId: 'wallet-123',
        signerAddress,
        signerName: 'Signer 1',
        role: SignerRole.APPROVER,
        status: SignerStatus.ACTIVE,
        approvalCount: 0,
        rejectionCount: 0,
        addedBy: testUserId,
        addedAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSigner;

      mockTransactionRepo.findOne.mockResolvedValue(mockTx);
      mockSignatureRepo.findOne.mockResolvedValue(mockSignature);
      mockSignerRepo.findOne.mockResolvedValue(mockSigner);
      mockSignatureRepo.save.mockResolvedValue({ ...mockSignature, status: SignatureStatus.SIGNED, signedAt: new Date() });
      mockSignerRepo.save.mockResolvedValue(mockSigner);
      mockTransactionRepo.save.mockResolvedValue(mockTx);

      const approveDto: ApproveTransactionDto = {
        multiSigTransactionId: transactionId,
        signerAddress,
        comment: 'Approved',
      };

      const result = await service.approveTransaction(approveDto, testUserId);

      expect(result.approved).toBe(false); // threshold is 2, only 1 approval
      expect(mockSignatureRepo.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'multisig.transaction.approved',
        expect.any(Object),
      );
    });

    it('should mark transaction as approved when threshold reached', async () => {
      const transactionId = 'tx-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockTx = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        transactionType: MultiSigTransactionType.PAYOUT,
        status: MultiSigTransactionStatus.PENDING,
        destinationAddress: signerAddress,
        amount: 1000,
        asset: 'XLM',
        approvalsReceived: 1, // Already 1 approval
        rejectionsReceived: 0,
        threshold: 2,
        initiatedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Test payout',
        lastModifiedBy: testUserId,
      } as MultiSigTransaction;

      const mockSignature = {
        id: 'sig-123',
        multiSigTransactionId: transactionId,
        signerAddress,
        signerName: 'Signer 2',
        status: SignatureStatus.PENDING,
        comment: 'Approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MultiSigSignature;

      mockTransactionRepo.findOne.mockResolvedValue(mockTx);
      mockSignatureRepo.findOne.mockResolvedValue(mockSignature);
      mockSignatureRepo.save.mockResolvedValue({ ...mockSignature, status: SignatureStatus.SIGNED });
      mockSignerRepo.findOne.mockResolvedValue({});
      mockSignerRepo.save.mockResolvedValue({});
      mockTransactionRepo.save.mockResolvedValue({
        ...mockTx,
        approvalsReceived: 2,
        status: MultiSigTransactionStatus.APPROVED,
      });

      const approveDto: ApproveTransactionDto = {
        multiSigTransactionId: transactionId,
        signerAddress,
      };

      const result = await service.approveTransaction(approveDto, testUserId);

      expect(result.approved).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'multisig.transaction.approved_complete',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      // Requirements: 4.6
      const approveDto: ApproveTransactionDto = {
        multiSigTransactionId: 'nonexistent-tx',
        signerAddress: 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R',
      };

      mockTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.approveTransaction(approveDto, testUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when signature record does not exist for signer', async () => {
      // Requirements: 4.4
      const transactionId = 'tx-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockTx = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        status: MultiSigTransactionStatus.PENDING,
        approvalsReceived: 0,
        threshold: 2,
      } as MultiSigTransaction;

      mockTransactionRepo.findOne.mockResolvedValue(mockTx);
      mockSignatureRepo.findOne.mockResolvedValue(null);

      const approveDto: ApproveTransactionDto = {
        multiSigTransactionId: transactionId,
        signerAddress,
      };

      await expect(service.approveTransaction(approveDto, testUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when signature is already SIGNED (double-approve)', async () => {
      // Requirements: 4.5
      const transactionId = 'tx-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockTx = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        status: MultiSigTransactionStatus.PENDING,
        approvalsReceived: 1,
        threshold: 2,
      } as MultiSigTransaction;

      const alreadySignedSignature = {
        id: 'sig-123',
        multiSigTransactionId: transactionId,
        signerAddress,
        status: SignatureStatus.SIGNED,
        signedAt: new Date(),
      } as MultiSigSignature;

      mockTransactionRepo.findOne.mockResolvedValue(mockTx);
      mockSignatureRepo.findOne.mockResolvedValue(alreadySignedSignature);

      const approveDto: ApproveTransactionDto = {
        multiSigTransactionId: transactionId,
        signerAddress,
      };

      await expect(service.approveTransaction(approveDto, testUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateThreshold', () => {
    const walletId = 'wallet-123';

    const mockWallet = {
      id: walletId,
      organizationId: testOrgId,
      walletAddress: testWalletAddress,
      name: 'Test Wallet',
      threshold: 2,
      totalSigners: 3,
      status: MultiSigWalletStatus.ACTIVE,
      totalTransactions: 0,
      approvedTransactions: 0,
      totalAmountApproved: 0,
      createdBy: testUserId,
      lastModifiedBy: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    } as MultiSigWallet;

    it('should update threshold to 1 (minimum) and emit multisig.threshold.updated', async () => {
      const updateDto: UpdateThresholdDto = {
        multiSigWalletId: walletId,
        threshold: 1,
      };

      const updatedWallet = { ...mockWallet, threshold: 1 } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue({ ...mockWallet });
      mockWalletRepo.save.mockResolvedValue(updatedWallet);

      const result = await service.updateThreshold(updateDto, testUserId);

      expect(result.threshold).toBe(1);
      expect(mockWalletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ threshold: 1 }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.threshold.updated', {
        walletId,
        newThreshold: 1,
      });
    });

    it('should update threshold to totalSigners (maximum) and emit multisig.threshold.updated', async () => {
      const updateDto: UpdateThresholdDto = {
        multiSigWalletId: walletId,
        threshold: 3, // equals totalSigners
      };

      const updatedWallet = { ...mockWallet, threshold: 3 } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue({ ...mockWallet });
      mockWalletRepo.save.mockResolvedValue(updatedWallet);

      const result = await service.updateThreshold(updateDto, testUserId);

      expect(result.threshold).toBe(3);
      expect(mockWalletRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ threshold: 3 }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.threshold.updated', {
        walletId,
        newThreshold: 3,
      });
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      const updateDto: UpdateThresholdDto = {
        multiSigWalletId: walletId,
        threshold: 2,
      };

      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.updateThreshold(updateDto, testUserId)).rejects.toThrow(
        'Multi-sig wallet not found',
      );
    });
  });

  describe('getWalletStats', () => {
    it('should retrieve wallet statistics', async () => {
      const walletId = 'wallet-123';

      const mockWallet = {
        id: walletId,
        organizationId: testOrgId,
        walletAddress: testWalletAddress,
        name: 'Test Wallet',
        threshold: 2,
        totalSigners: 3,
        status: MultiSigWalletStatus.ACTIVE,
        totalTransactions: 10,
        approvedTransactions: 8,
        totalAmountApproved: 50000,
        createdBy: testUserId,
        lastModifiedBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockTransactionRepo.count
        .mockResolvedValueOnce(8) // completed
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(1); // rejected

      const stats = await service.getWalletStats(walletId);

      expect(stats.walletAddress).toBe(testWalletAddress);
      expect(stats.threshold).toBe(2);
      expect(stats.completedTransactions).toBe(8);
      expect(stats.pendingTransactions).toBe(1);
      expect(stats.rejectedTransactions).toBe(1);
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      // Requirements: 6.5
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.getWalletStats('nonexistent-wallet')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rejectTransaction', () => {
    const transactionId = 'tx-reject-123';
    const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';
    const rejectionReason = 'Amount too high';

    const rejectDto: RejectTransactionDto = {
      multiSigTransactionId: transactionId,
      signerAddress,
      rejectionReason,
    };

    const mockPendingTx = {
      id: transactionId,
      multiSigWalletId: 'wallet-123',
      transactionType: MultiSigTransactionType.PAYOUT,
      status: MultiSigTransactionStatus.PENDING,
      destinationAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
      amount: 1000,
      asset: 'XLM',
      approvalsReceived: 0,
      rejectionsReceived: 0,
      threshold: 2,
      initiatedBy: testUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      description: 'Test payout',
      lastModifiedBy: testUserId,
    } as MultiSigTransaction;

    const mockPendingSignature = {
      id: 'sig-reject-123',
      multiSigTransactionId: transactionId,
      signerAddress,
      signerName: 'Signer 1',
      status: SignatureStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MultiSigSignature;

    const mockSigner = {
      id: 'signer-123',
      multiSigWalletId: 'wallet-123',
      signerAddress,
      signerName: 'Signer 1',
      role: SignerRole.APPROVER,
      status: SignerStatus.ACTIVE,
      approvalCount: 0,
      rejectionCount: 0,
      addedBy: testUserId,
      addedAt: new Date(),
      updatedAt: new Date(),
    } as MultiSigSigner;

    it('should reject a pending transaction, set failureReason, and emit multisig.transaction.rejected', async () => {
      // Requirements: 5.1, 5.8
      const rejectedTx = {
        ...mockPendingTx,
        status: MultiSigTransactionStatus.REJECTED,
        rejectionsReceived: 1,
        failureReason: `Rejected by ${signerAddress}: ${rejectionReason}`,
      } as MultiSigTransaction;

      mockTransactionRepo.findOne.mockResolvedValue({ ...mockPendingTx });
      mockSignatureRepo.findOne.mockResolvedValue({ ...mockPendingSignature });
      mockSignatureRepo.save.mockResolvedValue({
        ...mockPendingSignature,
        status: SignatureStatus.REJECTED,
        rejectionReason,
        rejectedAt: new Date(),
      });
      mockTransactionRepo.save.mockResolvedValue(rejectedTx);
      mockSignerRepo.findOne.mockResolvedValue({ ...mockSigner });
      mockSignerRepo.save.mockResolvedValue({ ...mockSigner, rejectionCount: 1, lastRejectionAt: new Date() });

      const result = await service.rejectTransaction(rejectDto, testUserId);

      expect(result.status).toBe(MultiSigTransactionStatus.REJECTED);
      expect(result.failureReason).toContain(rejectionReason);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.transaction.rejected', {
        transactionId,
        signer: signerAddress,
        reason: rejectionReason,
      });
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      // Requirements: 5.6
      mockTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectTransaction(rejectDto, testUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when signature record does not exist for signer', async () => {
      // Requirements: 5.4
      mockTransactionRepo.findOne.mockResolvedValue({ ...mockPendingTx });
      mockSignatureRepo.findOne.mockResolvedValue(null);

      await expect(service.rejectTransaction(rejectDto, testUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when signature is already REJECTED (double-reject)', async () => {
      // Requirements: 5.5
      const alreadyRejectedSignature = {
        ...mockPendingSignature,
        status: SignatureStatus.REJECTED,
        rejectedAt: new Date(),
      } as MultiSigSignature;

      mockTransactionRepo.findOne.mockResolvedValue({ ...mockPendingTx });
      mockSignatureRepo.findOne.mockResolvedValue(alreadyRejectedSignature);

      await expect(service.rejectTransaction(rejectDto, testUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWalletDetails', () => {
    it('should throw NotFoundException when wallet does not exist', async () => {
      // Requirements: 6.2
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.getWalletDetails('nonexistent-wallet')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTransactionSignatures', () => {
    it('should return all signature records for a transaction', async () => {
      // Requirements: 6.4
      const transactionId = 'tx-sigs-123';
      const mockSignatures = [
        {
          id: 'sig-1',
          multiSigTransactionId: transactionId,
          signerAddress: 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R',
          status: SignatureStatus.SIGNED,
          createdAt: new Date(),
        } as MultiSigSignature,
        {
          id: 'sig-2',
          multiSigTransactionId: transactionId,
          signerAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
          status: SignatureStatus.PENDING,
          createdAt: new Date(),
        } as MultiSigSignature,
        {
          id: 'sig-3',
          multiSigTransactionId: transactionId,
          signerAddress: 'GDQJUTQYK2MQX2VGDR2FYWLIYAQIEGXTQVTFEMGH3IEQBOHAVSQ37YR',
          status: SignatureStatus.REJECTED,
          createdAt: new Date(),
        } as MultiSigSignature,
      ];

      mockSignatureRepo.find.mockResolvedValue(mockSignatures);

      const result = await service.getTransactionSignatures(transactionId);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockSignatures);
      expect(mockSignatureRepo.find).toHaveBeenCalledWith({
        where: { multiSigTransactionId: transactionId },
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('createTransaction', () => {
    const createDto: CreateMultiSigTransactionDto = {
      multiSigWalletId: 'wallet-123',
      destinationAddress: 'GBZXN7PIRZNT4Z5TZHTG2793CFAND3P5PMXEVII27KSKNM7TOTF7YLT2',
      amount: 500,
      asset: 'XLM',
      description: 'Test payout',
    };

    it('should throw BadRequestException when wallet status is INACTIVE', async () => {
      // Requirements: 3.1
      const inactiveWallet = {
        id: 'wallet-123',
        status: MultiSigWalletStatus.INACTIVE,
        threshold: 2,
        totalSigners: 3,
      } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue(inactiveWallet);

      await expect(service.createTransaction(createDto, testUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when wallet status is SUSPENDED', async () => {
      // Requirements: 3.2
      const suspendedWallet = {
        id: 'wallet-123',
        status: MultiSigWalletStatus.SUSPENDED,
        threshold: 2,
        totalSigners: 3,
      } as MultiSigWallet;

      mockWalletRepo.findOne.mockResolvedValue(suspendedWallet);

      await expect(service.createTransaction(createDto, testUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      // Requirements: 3.3
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(service.createTransaction(createDto, testUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should emit multisig.transaction.created with correct walletId, amount, and threshold', async () => {
      // Requirements: 3.7
      const activeWallet = {
        id: 'wallet-123',
        status: MultiSigWalletStatus.ACTIVE,
        threshold: 2,
        totalSigners: 3,
        totalTransactions: 5,
        lastActivityAt: new Date(),
      } as MultiSigWallet;

      const savedTx = {
        id: 'tx-new-123',
        multiSigWalletId: 'wallet-123',
        amount: 500,
        threshold: 2,
        status: MultiSigTransactionStatus.PENDING,
      } as MultiSigTransaction;

      mockWalletRepo.findOne.mockResolvedValue(activeWallet);
      mockTransactionRepo.create.mockReturnValue(savedTx);
      mockTransactionRepo.save.mockResolvedValue(savedTx);
      mockSignerRepo.find.mockResolvedValue([]);
      mockWalletRepo.save.mockResolvedValue({ ...activeWallet, totalTransactions: 6 });

      await service.createTransaction(createDto, testUserId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('multisig.transaction.created', {
        transactionId: 'tx-new-123',
        walletId: 'wallet-123',
        amount: 500,
        threshold: 2,
      });
    });
  });
});
