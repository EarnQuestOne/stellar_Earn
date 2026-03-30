import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payout, PayoutStatus } from '../../payouts/entities/payout.entity';
import { MultiSigTransaction, MultiSigTransactionStatus } from '../entities/multisig-transaction.entity';
import { MultiSigWallet } from '../entities/multisig-wallet.entity';
import { CreateMultiSigTransactionDto } from '../dto/multisig.dto';
import { MultiSigWalletService } from './multisig-wallet.service';

export interface MultiSigPayoutEscrow {
  payoutId: string;
  multiSigTransactionId: string;
  amount: number;
  status: string;
  approvalsReceived: number;
  threshold: number;
  initiatedAt: Date;
  approvers: string[];
}

@Injectable()
export class MultiSigPayoutService {
  private readonly logger = new Logger(MultiSigPayoutService.name);

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(MultiSigTransaction)
    private readonly transactionRepository: Repository<MultiSigTransaction>,
    @InjectRepository(MultiSigWallet)
    private readonly walletRepository: Repository<MultiSigWallet>,
    private readonly multiSigWalletService: MultiSigWalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a multi-sig payout escrow
   */
  async createPayoutEscrow(
    payoutId: string,
    multiSigWalletId: string,
    destinationAddress: string,
    amount: number,
    userId: string,
  ): Promise<MultiSigPayoutEscrow> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Payout status must be PENDING, current: ${payout.status}`);
    }

    // Create multi-sig transaction for the payout
    const createDto: CreateMultiSigTransactionDto = {
      multiSigWalletId,
      destinationAddress,
      amount,
      asset: payout.asset || 'XLM',
      description: `Payout for submission ${payout.submissionId} - Quest ${payout.questId}`,
      transactionPayload: JSON.stringify({
        payoutId,
        questId: payout.questId,
        submissionId: payout.submissionId,
        stellarAddress: payout.stellarAddress,
      }),
    };

    const transaction = await this.multiSigWalletService.createTransaction(createDto, userId);

    // Update payout status to awaiting approval
    payout.status = PayoutStatus.AWAITING_APPROVAL;
    await this.payoutRepository.save(payout);

    this.logger.log(`Payout escrow created: ${payoutId}`, {
      multiSigTransactionId: transaction.id,
      amount,
      walletId: multiSigWalletId,
    });

    this.eventEmitter.emit('multisig.payout.escrow_created', {
      payoutId,
      multiSigTransactionId: transaction.id,
      amount,
    });

    return this.buildPayoutEscrow(transaction);
  }

  /**
   * Check if payout has sufficient multi-sig approvals
   */
  async checkPayoutApprovalStatus(payoutId: string): Promise<{
    approved: boolean;
    approvalsReceived: number;
    threshold: number;
    remainingApprovals: number;
  }> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    // Find the multi-sig transaction for this payout
    const transactions = await this.transactionRepository.find({
      where: { multiSigWalletId: '' }, // Will be filtered in memory
    });

    const payoutTransaction = transactions.find((tx) => {
      try {
        const payload = JSON.parse(tx.transactionPayload || '{}');
        return payload.payoutId === payoutId;
      } catch {
        return false;
      }
    });

    if (!payoutTransaction) {
      throw new NotFoundException('Multi-sig transaction not found for this payout');
    }

    const approved = payoutTransaction.status === MultiSigTransactionStatus.APPROVED;
    const remainingApprovals = Math.max(0, payoutTransaction.threshold - payoutTransaction.approvalsReceived);

    return {
      approved,
      approvalsReceived: payoutTransaction.approvalsReceived,
      threshold: payoutTransaction.threshold,
      remainingApprovals,
    };
  }

  /**
   * Auto-complete payout when multi-sig transaction is approved
   */
  async processApprovedPayout(multiSigTransactionId: string): Promise<Payout> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: multiSigTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Multi-sig transaction not found');
    }

    if (transaction.status !== MultiSigTransactionStatus.APPROVED) {
      throw new BadRequestException('Transaction must be approved to process payout');
    }

    // Find payout using transaction payload
    const payload = JSON.parse(transaction.transactionPayload || '{}');
    const payout = await this.payoutRepository.findOne({
      where: { id: payload.payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found for this transaction');
    }

    // Update payout status
    payout.status = PayoutStatus.PROCESSING;
    payout.transactionHash = transaction.stellarTransactionHash || null;
    await this.payoutRepository.save(payout);

    this.logger.log(`Payout approved and ready for processing: ${payout.id}`, {
      multiSigTransactionId,
      amount: payout.amount,
    });

    this.eventEmitter.emit('multisig.payout.approved', {
      payoutId: payout.id,
      multiSigTransactionId,
      amount: payout.amount,
    });

    return payout;
  }

  /**
   * Handle rejected payout
   */
  async handleRejectedPayout(multiSigTransactionId: string, reason: string): Promise<Payout> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: multiSigTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Multi-sig transaction not found');
    }

    const payload = JSON.parse(transaction.transactionPayload || '{}');
    const payout = await this.payoutRepository.findOne({
      where: { id: payload.payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found for this transaction');
    }

    payout.status = PayoutStatus.FAILED;
    payout.failureReason = `Multi-sig rejection: ${reason}`;
    await this.payoutRepository.save(payout);

    this.logger.log(`Payout rejected: ${payout.id}`, {
      multiSigTransactionId,
      reason,
    });

    this.eventEmitter.emit('multisig.payout.rejected', {
      payoutId: payout.id,
      multiSigTransactionId,
      reason,
    });

    return payout;
  }

  /**
   * Get multi-sig dashboard data for pending payouts
   */
  async getPayoutApprovalDashboard(multiSigWalletId: string) {
    const wallet = await this.walletRepository.findOne({
      where: { id: multiSigWalletId },
    });

    if (!wallet) {
      throw new NotFoundException('Multi-sig wallet not found');
    }

    const pendingTransactions = await this.transactionRepository.find({
      where: {
        multiSigWalletId,
        status: MultiSigTransactionStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    const pendingPayouts = pendingTransactions.map((tx) => {
      const payload = JSON.parse(tx.transactionPayload || '{}');
      return {
        payoutId: payload.payoutId,
        multiSigTransactionId: tx.id,
        questId: payload.questId,
        submissionId: payload.submissionId,
        destinationAddress: tx.destinationAddress,
        amount: tx.amount,
        asset: tx.asset,
        approvalsReceived: tx.approvalsReceived,
        threshold: tx.threshold,
        remainingApprovals: Math.max(0, tx.threshold - tx.approvalsReceived),
        initiatedAt: tx.createdAt,
        expiresAt: tx.expiresAt,
        initiatedBy: tx.initiatedBy,
      };
    });

    const approvedTransactions = await this.transactionRepository.find({
      where: {
        multiSigWalletId,
        status: MultiSigTransactionStatus.APPROVED,
      },
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    const approvedPayouts = approvedTransactions.map((tx) => {
      const payload = JSON.parse(tx.transactionPayload || '{}');
      return {
        payoutId: payload.payoutId,
        amount: tx.amount,
        approvedAt: tx.updatedAt,
        approvalsReceived: tx.approvalsReceived,
      };
    });

    return {
      walletAddress: wallet.walletAddress,
      threshold: wallet.threshold,
      totalSigners: wallet.totalSigners,
      pendingPayouts,
      pendingCount: pendingPayouts.length,
      approvedPayouts,
      approvedCount: approvedPayouts.length,
    };
  }

  private buildPayoutEscrow(transaction: MultiSigTransaction): MultiSigPayoutEscrow {
    const payload = JSON.parse(transaction.transactionPayload || '{}');
    return {
      payoutId: payload.payoutId,
      multiSigTransactionId: transaction.id,
      amount: transaction.amount,
      status: transaction.status,
      approvalsReceived: transaction.approvalsReceived,
      threshold: transaction.threshold,
      initiatedAt: transaction.createdAt,
      approvers: [],
    };
  }
}
