import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MultiSigWalletService } from '../stellar/multisig/services/multisig-wallet.service';
import { MultiSigWallet, MultiSigWalletStatus } from '../stellar/multisig/entities/multisig-wallet.entity';
import { MultiSigSigner, SignerRole, SignerStatus } from '../stellar/multisig/entities/multisig-signer.entity';
import { MultiSigTransaction, MultiSigTransactionStatus } from '../stellar/multisig/entities/multisig-transaction.entity';
import { MultiSigSignature, SignatureStatus } from '../stellar/multisig/entities/multisig-signature.entity';
import { CreateMultiSigWalletDto, ApproveTransactionDto } from '../stellar/multisig/dto/multisig.dto';

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

      const expectedWallet: MultiSigWallet = {
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
      };

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

      const mockWallet: MultiSigWallet = {
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
      };

      const expectedSigner: MultiSigSigner = {
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
      };

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
  });

  describe('approveTransaction', () => {
    it('should approve transaction and update signature', async () => {
      const transactionId = 'tx-123';
      const signerAddress = 'GCZST3XVCDTUJ76ZAV2HA72KYRF5QSGN4BXDGWV6MWVR5DXWPQSWVF5R';

      const mockTx: MultiSigTransaction = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        transactionType: 'PAYOUT',
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
        transactionPayload: null,
        description: 'Test payout',
        lastModifiedBy: testUserId,
      };

      const mockSignature: MultiSigSignature = {
        id: 'sig-123',
        multiSigTransactionId: transactionId,
        signerAddress,
        signerName: 'Signer 1',
        status: SignatureStatus.PENDING,
        signature: null,
        comment: 'Approved',
        signedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        signatureExpiresAt: null,
      };

      const mockSigner: MultiSigSigner = {
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
      };

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

      const mockTx: MultiSigTransaction = {
        id: transactionId,
        multiSigWalletId: 'wallet-123',
        transactionType: 'PAYOUT',
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
        transactionPayload: null,
        description: 'Test payout',
        lastModifiedBy: testUserId,
      };

      const mockSignature: MultiSigSignature = {
        id: 'sig-123',
        multiSigTransactionId: transactionId,
        signerAddress,
        signerName: 'Signer 2',
        status: SignatureStatus.PENDING,
        signature: null,
        comment: 'Approved',
        signedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        signatureExpiresAt: null,
      };

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
  });

  describe('getWalletStats', () => {
    it('should retrieve wallet statistics', async () => {
      const walletId = 'wallet-123';

      const mockWallet: MultiSigWallet = {
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
      };

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
  });
});
