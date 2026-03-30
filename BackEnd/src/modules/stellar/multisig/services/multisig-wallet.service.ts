import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MultiSigWallet, MultiSigWalletStatus } from '../entities/multisig-wallet.entity';
import { MultiSigSigner, SignerStatus, SignerRole } from '../entities/multisig-signer.entity';
import {
  MultiSigTransaction,
  MultiSigTransactionStatus,
  MultiSigTransactionType,
} from '../entities/multisig-transaction.entity';
import { MultiSigSignature, SignatureStatus } from '../entities/multisig-signature.entity';
import {
  CreateMultiSigWalletDto,
  AddSignerDto,
  UpdateThresholdDto,
  CreateMultiSigTransactionDto,
  ApproveTransactionDto,
  RejectTransactionDto,
} from '../dto/multisig.dto';

@Injectable()
export class MultiSigWalletService {
  private readonly logger = new Logger(MultiSigWalletService.name);

  constructor(
    @InjectRepository(MultiSigWallet)
    private readonly walletRepository: Repository<MultiSigWallet>,
    @InjectRepository(MultiSigSigner)
    private readonly signerRepository: Repository<MultiSigSigner>,
    @InjectRepository(MultiSigTransaction)
    private readonly transactionRepository: Repository<MultiSigTransaction>,
    @InjectRepository(MultiSigSignature)
    private readonly signatureRepository: Repository<MultiSigSignature>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new multi-sig wallet
   */
  async createWallet(createDto: CreateMultiSigWalletDto, userId: string): Promise<MultiSigWallet> {
    const existing = await this.walletRepository.findOne({
      where: {
        organizationId: createDto.organizationId,
        walletAddress: createDto.walletAddress,
      },
    });

    if (existing) {
      throw new BadRequestException('Multi-sig wallet already exists for this organization and address');
    }

    if (createDto.threshold > createDto.totalSigners) {
      throw new BadRequestException('Threshold cannot exceed total signers');
    }

    const wallet = this.walletRepository.create({
      ...createDto,
      status: MultiSigWalletStatus.ACTIVE,
      createdBy: userId,
      lastModifiedBy: userId,
      lastActivityAt: new Date(),
    });

    const saved = await this.walletRepository.save(wallet);
    this.logger.log(`Multi-sig wallet created: ${saved.id}`, {
      organizationId: createDto.organizationId,
      walletAddress: createDto.walletAddress,
      threshold: createDto.threshold,
    });

    this.eventEmitter.emit('multisig.wallet.created', {
      walletId: saved.id,
      organizationId: createDto.organizationId,
      threshold: createDto.threshold,
    });

    return saved;
  }

  /**
   * Add signer to multi-sig wallet
   */
  async addSigner(addDto: AddSignerDto, userId: string): Promise<MultiSigSigner> {
    const wallet = await this.walletRepository.findOne({
      where: { id: addDto.multiSigWalletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    const existing = await this.signerRepository.findOne({
      where: {
        multiSigWalletId: addDto.multiSigWalletId,
        signerAddress: addDto.signerAddress,
      },
    });

    if (existing && existing.status !== SignerStatus.REMOVED) {
      throw new BadRequestException('Signer already exists for this wallet');
    }

    const signer = this.signerRepository.create({
      multiSigWalletId: addDto.multiSigWalletId,
      signerAddress: addDto.signerAddress,
      signerName: addDto.signerName,
      role: addDto.role || SignerRole.APPROVER,
      status: SignerStatus.ACTIVE,
      addedBy: userId,
      addedAt: new Date(),
    });

    const saved = await this.signerRepository.save(signer);
    wallet.lastModifiedBy = userId;
    wallet.lastActivityAt = new Date();
    await this.walletRepository.save(wallet);

    this.logger.log(`Signer added to wallet: ${addDto.multiSigWalletId}`, {
      signerAddress: addDto.signerAddress,
      role: addDto.role,
    });

    this.eventEmitter.emit('multisig.signer.added', {
      walletId: addDto.multiSigWalletId,
      signerAddress: addDto.signerAddress,
      role: addDto.role,
    });

    return saved;
  }

  /**
   * Remove signer from wallet
   */
  async removeSigner(
    multiSigWalletId: string,
    signerAddress: string,
    userId: string,
  ): Promise<MultiSigSigner> {
    const signer = await this.signerRepository.findOne({
      where: {
        multiSigWalletId,
        signerAddress,
      },
    });

    if (!signer) {
      throw new NotFoundException('Signer not found');
    }

    signer.status = SignerStatus.REMOVED;
    signer.removedBy = userId;
    signer.removedAt = new Date();

    const updated = await this.signerRepository.save(signer);

    const wallet = await this.walletRepository.findOne({
      where: { id: multiSigWalletId },
    });
    wallet.lastModifiedBy = userId;
    wallet.lastActivityAt = new Date();
    await this.walletRepository.save(wallet);

    this.logger.log(`Signer removed from wallet: ${multiSigWalletId}`, {
      signerAddress,
    });

    this.eventEmitter.emit('multisig.signer.removed', {
      walletId: multiSigWalletId,
      signerAddress,
    });

    return updated;
  }

  /**
   * Update wallet threshold
   */
  async updateThreshold(updateDto: UpdateThresholdDto, userId: string): Promise<MultiSigWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: updateDto.multiSigWalletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    if (updateDto.threshold > wallet.totalSigners) {
      throw new BadRequestException('Threshold cannot exceed total signers');
    }

    wallet.threshold = updateDto.threshold;
    wallet.lastModifiedBy = userId;
    wallet.lastActivityAt = new Date();

    const updated = await this.walletRepository.save(wallet);
    this.logger.log(`Wallet threshold updated: ${updateDto.multiSigWalletId}`, {
      newThreshold: updateDto.threshold,
    });

    this.eventEmitter.emit('multisig.threshold.updated', {
      walletId: updateDto.multiSigWalletId,
      newThreshold: updateDto.threshold,
    });

    return updated;
  }

  /**
   * Create a new multi-sig transaction requiring approvals
   */
  async createTransaction(
    createDto: CreateMultiSigTransactionDto,
    userId: string,
  ): Promise<MultiSigTransaction> {
    const wallet = await this.walletRepository.findOne({
      where: { id: createDto.multiSigWalletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    if (wallet.status !== MultiSigWalletStatus.ACTIVE) {
      throw new BadRequestException('Multi-sig wallet is not active');
    }

    const transaction = this.transactionRepository.create({
      multiSigWalletId: createDto.multiSigWalletId,
      transactionType: MultiSigTransactionType.PAYOUT,
      destinationAddress: createDto.destinationAddress,
      amount: createDto.amount,
      asset: createDto.asset || 'XLM',
      description: createDto.description,
      transactionPayload: createDto.transactionPayload,
      status: MultiSigTransactionStatus.PENDING,
      threshold: wallet.threshold,
      initiatedBy: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
    });

    const savedTx = await this.transactionRepository.save(transaction);

    // Create pending signatures for all active approvers
    const approvers = await this.signerRepository.find({
      where: {
        multiSigWalletId: createDto.multiSigWalletId,
        status: SignerStatus.ACTIVE,
        role: SignerRole.APPROVER,
      },
    });

    for (const approver of approvers) {
      await this.signatureRepository.save({
        multiSigTransactionId: savedTx.id,
        signerAddress: approver.signerAddress,
        signerName: approver.signerName,
        status: SignatureStatus.PENDING,
        signatureExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    wallet.totalTransactions += 1;
    wallet.lastActivityAt = new Date();
    await this.walletRepository.save(wallet);

    this.logger.log(`Multi-sig transaction created: ${savedTx.id}`, {
      walletId: createDto.multiSigWalletId,
      destination: createDto.destinationAddress,
      amount: createDto.amount,
      threshold: wallet.threshold,
    });

    this.eventEmitter.emit('multisig.transaction.created', {
      transactionId: savedTx.id,
      walletId: createDto.multiSigWalletId,
      amount: createDto.amount,
      threshold: wallet.threshold,
    });

    return savedTx;
  }

  /**
   * Approve a pending transaction
   */
  async approveTransaction(
    approveDto: ApproveTransactionDto,
    userId: string,
  ): Promise<{ transaction: MultiSigTransaction; approved: boolean }> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: approveDto.multiSigTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Multi-sig transaction not found');
    }

    if (transaction.status !== MultiSigTransactionStatus.PENDING) {
      throw new BadRequestException(`Cannot approve transaction with status: ${transaction.status}`);
    }

    const signature = await this.signatureRepository.findOne({
      where: {
        multiSigTransactionId: approveDto.multiSigTransactionId,
        signerAddress: approveDto.signerAddress,
      },
    });

    if (!signature) {
      throw new NotFoundException('Signature record not found for this signer');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new BadRequestException(`Signature already has status: ${signature.status}`);
    }

    signature.status = SignatureStatus.SIGNED;
    signature.signedAt = new Date();
    signature.comment = approveDto.comment;
    await this.signatureRepository.save(signature);

    transaction.approvalsReceived += 1;
    transaction.lastModifiedBy = userId;
    await this.transactionRepository.save(transaction);

    // Update signer stats
    const signer = await this.signerRepository.findOne({
      where: {
        multiSigWalletId: transaction.multiSigWalletId,
        signerAddress: approveDto.signerAddress,
      },
    });

    if (signer) {
      signer.approvalCount += 1;
      signer.lastApprovalAt = new Date();
      await this.signerRepository.save(signer);
    }

    this.logger.log(`Transaction approved: ${approveDto.multiSigTransactionId}`, {
      signer: approveDto.signerAddress,
      approvalsReceived: transaction.approvalsReceived,
      threshold: transaction.threshold,
    });

    this.eventEmitter.emit('multisig.transaction.approved', {
      transactionId: approveDto.multiSigTransactionId,
      signer: approveDto.signerAddress,
      approvalsReceived: transaction.approvalsReceived,
      threshold: transaction.threshold,
    });

    // Check if threshold met
    const approved = transaction.approvalsReceived >= transaction.threshold;
    if (approved) {
      transaction.status = MultiSigTransactionStatus.APPROVED;
      await this.transactionRepository.save(transaction);

      this.logger.log(`Transaction approved! Ready for execution: ${approveDto.multiSigTransactionId}`, {
        approvalsReceived: transaction.approvalsReceived,
        threshold: transaction.threshold,
      });

      this.eventEmitter.emit('multisig.transaction.approved_complete', {
        transactionId: approveDto.multiSigTransactionId,
        approvalsReceived: transaction.approvalsReceived,
      });
    }

    return {
      transaction,
      approved,
    };
  }

  /**
   * Reject a pending transaction
   */
  async rejectTransaction(
    rejectDto: RejectTransactionDto,
    userId: string,
  ): Promise<MultiSigTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: rejectDto.multiSigTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Multi-sig transaction not found');
    }

    if (transaction.status !== MultiSigTransactionStatus.PENDING) {
      throw new BadRequestException(`Cannot reject transaction with status: ${transaction.status}`);
    }

    const signature = await this.signatureRepository.findOne({
      where: {
        multiSigTransactionId: rejectDto.multiSigTransactionId,
        signerAddress: rejectDto.signerAddress,
      },
    });

    if (!signature) {
      throw new NotFoundException('Signature record not found for this signer');
    }

    if (signature.status !== SignatureStatus.PENDING) {
      throw new BadRequestException(`Signature already has status: ${signature.status}`);
    }

    signature.status = SignatureStatus.REJECTED;
    signature.rejectionReason = rejectDto.rejectionReason;
    signature.rejectedAt = new Date();
    await this.signatureRepository.save(signature);

    transaction.rejectionsReceived += 1;
    transaction.status = MultiSigTransactionStatus.REJECTED;
    transaction.failureReason = `Rejected by ${rejectDto.signerAddress}: ${rejectDto.rejectionReason}`;
    await this.transactionRepository.save(transaction);

    // Update signer stats
    const signer = await this.signerRepository.findOne({
      where: {
        multiSigWalletId: transaction.multiSigWalletId,
        signerAddress: rejectDto.signerAddress,
      },
    });

    if (signer) {
      signer.rejectionCount += 1;
      signer.lastRejectionAt = new Date();
      await this.signerRepository.save(signer);
    }

    this.logger.log(`Transaction rejected: ${rejectDto.multiSigTransactionId}`, {
      signer: rejectDto.signerAddress,
      reason: rejectDto.rejectionReason,
    });

    this.eventEmitter.emit('multisig.transaction.rejected', {
      transactionId: rejectDto.multiSigTransactionId,
      signer: rejectDto.signerAddress,
      reason: rejectDto.rejectionReason,
    });

    return transaction;
  }

  /**
   * Get wallet details with signers
   */
  async getWalletDetails(walletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    const signers = await this.signerRepository.find({
      where: { multiSigWalletId: walletId },
      order: { addedAt: 'DESC' },
    });

    const activeSigners = signers.filter((s) => s.status === SignerStatus.ACTIVE);

    return {
      wallet,
      signers: activeSigners,
      activeSignerCount: activeSigners.length,
    };
  }

  /**
   * Get pending transactions for wallet
   */
  async getPendingTransactions(walletId: string) {
    return this.transactionRepository.find({
      where: {
        multiSigWalletId: walletId,
        status: MultiSigTransactionStatus.PENDING,
        expiresAt: MoreThanOrEqual(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get transaction signatures
   */
  async getTransactionSignatures(transactionId: string) {
    return this.signatureRepository.find({
      where: { multiSigTransactionId: transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(walletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    const completedTransactions = await this.transactionRepository.count({
      where: {
        multiSigWalletId: walletId,
        status: MultiSigTransactionStatus.COMPLETED,
      },
    });

    const pendingTransactions = await this.transactionRepository.count({
      where: {
        multiSigWalletId: walletId,
        status: MultiSigTransactionStatus.PENDING,
      },
    });

    const rejectedTransactions = await this.transactionRepository.count({
      where: {
        multiSigWalletId: walletId,
        status: MultiSigTransactionStatus.REJECTED,
      },
    });

    return {
      walletAddress: wallet.walletAddress,
      status: wallet.status,
      threshold: wallet.threshold,
      totalSigners: wallet.totalSigners,
      totalTransactions: wallet.totalTransactions,
      completedTransactions,
      pendingTransactions,
      rejectedTransactions,
      totalAmountApproved: wallet.totalAmountApproved,
      createdAt: wallet.createdAt,
      lastActivityAt: wallet.lastActivityAt,
    };
  }
}
