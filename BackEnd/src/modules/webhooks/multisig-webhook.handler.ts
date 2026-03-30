import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MultiSigPayoutService } from '../stellar/multisig/services/multisig-payout.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MultiSigTransaction, MultiSigTransactionStatus } from '../stellar/multisig/entities/multisig-transaction.entity';

@Injectable()
export class MultiSigWebhookHandler {
  private readonly logger = new Logger(MultiSigWebhookHandler.name);

  constructor(
    private readonly multiSigPayoutService: MultiSigPayoutService,
    @InjectRepository(MultiSigTransaction)
    private readonly transactionRepository: Repository<MultiSigTransaction>,
  ) {}

  /**
   * Handle multi-sig transaction approval
   */
  @OnEvent('multisig.transaction.approved_complete')
  async handleTransactionApproved(payload: {
    transactionId: string;
    approvalsReceived: number;
  }) {
    try {
      this.logger.debug('Processing multi-sig transaction approval', {
        transactionId: payload.transactionId,
      });

      const transaction = await this.transactionRepository.findOne({
        where: { id: payload.transactionId },
      });

      if (!transaction) {
        this.logger.warn('Transaction not found for approval event', {
          transactionId: payload.transactionId,
        });
        return;
      }

      // Check if this is a payout-related transaction
      if (transaction.transactionPayload) {
        try {
          const payloadData = JSON.parse(transaction.transactionPayload);
          if (payloadData.payoutId) {
            // Process approved payout
            await this.multiSigPayoutService.processApprovedPayout(payload.transactionId);
            this.logger.log('Payout processed after multi-sig approval', {
              transactionId: payload.transactionId,
              payoutId: payloadData.payoutId,
            });
          }
        } catch (error) {
          this.logger.error('Error processing approved payout', error, {
            transactionId: payload.transactionId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in multi-sig approval handler', error, {
        transactionId: payload.transactionId,
      });
    }
  }

  /**
   * Handle multi-sig transaction rejection
   */
  @OnEvent('multisig.transaction.rejected')
  async handleTransactionRejected(payload: {
    transactionId: string;
    signer: string;
    reason: string;
  }) {
    try {
      this.logger.debug('Processing multi-sig transaction rejection', {
        transactionId: payload.transactionId,
        signer: payload.signer,
      });

      const transaction = await this.transactionRepository.findOne({
        where: { id: payload.transactionId },
      });

      if (!transaction) {
        this.logger.warn('Transaction not found for rejection event', {
          transactionId: payload.transactionId,
        });
        return;
      }

      // Check if this is a payout-related transaction
      if (transaction.transactionPayload) {
        try {
          const payloadData = JSON.parse(transaction.transactionPayload);
          if (payloadData.payoutId) {
            // Handle rejected payout
            await this.multiSigPayoutService.handleRejectedPayout(
              payload.transactionId,
              payload.reason,
            );
            this.logger.log('Payout rejected after multi-sig rejection', {
              transactionId: payload.transactionId,
              payoutId: payloadData.payoutId,
              rejectionReason: payload.reason,
            });
          }
        } catch (error) {
          this.logger.error('Error handling rejected payout', error, {
            transactionId: payload.transactionId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error in multi-sig rejection handler', error, {
        transactionId: payload.transactionId,
      });
    }
  }

  /**
   * Handle wallet creation for logging/audit
   */
  @OnEvent('multisig.wallet.created')
  async handleWalletCreated(payload: {
    walletId: string;
    organizationId: string;
    threshold: number;
  }) {
    this.logger.log('Multi-sig wallet created', {
      walletId: payload.walletId,
      organizationId: payload.organizationId,
      threshold: payload.threshold,
    });
  }

  /**
   * Handle signer addition for audit
   */
  @OnEvent('multisig.signer.added')
  async handleSignerAdded(payload: {
    walletId: string;
    signerAddress: string;
    role: string;
  }) {
    this.logger.log('Signer added to multi-sig wallet', {
      walletId: payload.walletId,
      signer: payload.signerAddress,
      role: payload.role,
    });
  }

  /**
   * Handle signer removal for audit
   */
  @OnEvent('multisig.signer.removed')
  async handleSignerRemoved(payload: {
    walletId: string;
    signerAddress: string;
  }) {
    this.logger.log('Signer removed from multi-sig wallet', {
      walletId: payload.walletId,
      signer: payload.signerAddress,
    });
  }

  /**
   * Handle payout escrow creation
   */
  @OnEvent('multisig.payout.escrow_created')
  async handlePayoutEscrowCreated(payload: {
    payoutId: string;
    multiSigTransactionId: string;
    amount: number;
  }) {
    this.logger.log('Payout escrow created', {
      payoutId: payload.payoutId,
      multiSigTransactionId: payload.multiSigTransactionId,
      amount: payload.amount,
    });
  }
}
