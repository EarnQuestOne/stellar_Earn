import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payout, PayoutStatus } from '../../payouts/entities/payout.entity';
import {
  PayoutOutbox,
  PayoutOutboxStatus,
} from '../../payouts/entities/payout-outbox.entity';
import { JobLogService } from '../services/job-log.service';
import { PayoutsService } from '../../payouts/payouts.service';

/**
 * Payout Reconciliation Processor
 * BE-141: Adds a scheduled job that checks consistency between
 * off-chain DB records and on-chain Stellar transaction status.
 */
@Injectable()
export class PayoutReconciliationProcessor {
  private readonly logger = new Logger(PayoutReconciliationProcessor.name);
  private readonly horizonUrl: string;

  /** A PROCESSING outbox row older than this is treated as stuck (crash). */
  private readonly stuckOutboxMs = 15 * 60 * 1000;

  /** A payout in PROCESSING without a tx hash older than this is stuck. */
  private readonly stuckPayoutMs = 30 * 60 * 1000;

  /** Max payouts to recover per cycle to avoid thundering-herd re-submissions. */
  private readonly maxRecoverPerCycle = 50;

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(PayoutOutbox)
    private readonly outboxRepository: Repository<PayoutOutbox>,
    private readonly configService: ConfigService,
    private readonly jobLogService: JobLogService,
    private readonly payoutsService: PayoutsService,
  ) {
    this.horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      this.configService.get<string>('HORIZON_URL') ||
      'https://horizon.stellar.org';
  }

  /**
   * Recover transactional-outbox rows stuck mid-relay (#2158).
   *
   * A crash between claiming a row (`PENDING → PROCESSING`) and marking it DONE
   * would otherwise strand it forever. Rows left in PROCESSING beyond
   * `stuckOutboxMs` are reset to PENDING so the relay retries them; because the
   * relay is idempotent, replaying a row never double-submits a payment.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckPayoutOutbox(): Promise<void> {
    const threshold = new Date(Date.now() - this.stuckOutboxMs);
    const result = await this.outboxRepository.update(
      {
        status: PayoutOutboxStatus.PROCESSING,
        updatedAt: LessThan(threshold),
      },
      { status: PayoutOutboxStatus.PENDING },
    );

    if (result.affected) {
      this.logger.warn(
        `Recovered ${result.affected} stuck payout outbox row(s) back to PENDING`,
      );
    }
  }

  /**
   * Recover payouts stuck mid-flight (#stuck-payouts).
   *
   * A payout can get stuck in PROCESSING when the worker crashes before
   * submitting the Stellar payment (no transactionHash), or in
   * RETRY_SCHEDULED when the scheduled retry never fires.
   *
   * This job:
   *  1. Finds PROCESSING payouts with no tx hash older than `stuckPayoutMs`
   *     and resets them via `PayoutsService.forceResetPayout` so the next
   *     batch-payout cron picks them up.
   *  2. Finds RETRY_SCHEDULED payouts whose `nextRetryAt` has passed and
   *     resets them to PENDING for immediate re-drive.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async recoverStuckPayouts(): Promise<void> {
    const threshold = new Date(Date.now() - this.stuckPayoutMs);
    let recovered = 0;

    try {
      // 1 ─ PROCESSING without a tx hash, stuck longer than threshold ──────
      const stuckProcessing = await this.payoutRepository.find({
        where: {
          status: PayoutStatus.PROCESSING,
          transactionHash: IsNull(),
          createdAt: LessThan(threshold),
        },
        order: { createdAt: 'ASC' },
        take: this.maxRecoverPerCycle,
      });

      for (const payout of stuckProcessing) {
        try {
          const reset = await this.payoutsService.forceResetPayout(payout.id);
          if (reset) recovered++;
        } catch (err) {
          this.logger.error(
            `Failed to recover stuck payout ${payout.id}: ${err.message}`,
          );
        }
      }

      // 2 ─ RETRY_SCHEDULED with overdue nextRetryAt ───────────────────────
      const overdueRetries = await this.payoutRepository.find({
        where: {
          status: PayoutStatus.RETRY_SCHEDULED,
          nextRetryAt: LessThan(new Date()),
        },
        order: { nextRetryAt: 'ASC' },
        take: Math.max(0, this.maxRecoverPerCycle - recovered),
      });

      for (const payout of overdueRetries) {
        try {
          const reset = await this.payoutsService.forceResetPayout(payout.id);
          if (reset) recovered++;
        } catch (err) {
          this.logger.error(
            `Failed to recover overdue payout ${payout.id}: ${err.message}`,
          );
        }
      }

      if (recovered > 0) {
        this.logger.warn(
          `Stuck-payout recovery: reset ${recovered} payout(s) for re-drive`,
        );
      } else {
        this.logger.log('Stuck-payout recovery: no stuck payouts found');
      }
    } catch (error) {
      this.logger.error(
        `Stuck-payout recovery job failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Runs every 10 minutes.
   * Finds PROCESSING payouts that have a transactionHash and verifies
   * their on-chain status matches the off-chain DB record.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async runReconciliation(): Promise<void> {
    this.logger.log('Starting payout reconciliation job');

    const discrepancies: string[] = [];

    try {
      // Step 1: Find all PROCESSING payouts that have a transaction hash
      const processingPayouts = await this.payoutRepository.find({
        where: {
          status: In([PayoutStatus.PROCESSING, PayoutStatus.RETRY_SCHEDULED]),
        },
        take: 50,
      });

      const submittedPayouts = processingPayouts.filter(
        (p) => p.transactionHash,
      );

      if (submittedPayouts.length === 0) {
        this.logger.log('Reconciliation: no submitted payouts to check');
        return;
      }

      this.logger.log(
        `Reconciliation: checking ${submittedPayouts.length} payouts`,
      );

      // Step 2: For each payout, verify on-chain status
      for (const payout of submittedPayouts) {
        try {
          const onChainStatus = await this.fetchOnChainStatus(
            payout.transactionHash!,
          );

          if (!onChainStatus.found) {
            // Transaction not found on-chain — possible failure or delay
            discrepancies.push(
              `Payout ${payout.id}: tx ${payout.transactionHash} not found on-chain`,
            );
            this.logger.warn(
              `Reconciliation discrepancy — payout ${payout.id}: ` +
                `DB status=${payout.status}, on-chain=NOT FOUND`,
            );
            continue;
          }

          if (
            onChainStatus.successful &&
            payout.status !== PayoutStatus.COMPLETED
          ) {
            // On-chain says success but DB still shows processing
            discrepancies.push(
              `Payout ${payout.id}: on-chain succeeded but DB status=${payout.status}`,
            );
            this.logger.warn(
              `Reconciliation discrepancy — payout ${payout.id}: ` +
                `DB status=${payout.status}, on-chain=SUCCEEDED`,
            );

            // Heal: mark as completed in DB
            payout.status = PayoutStatus.COMPLETED;
            payout.processedAt = payout.processedAt ?? new Date();
            payout.settlementConfirmedAt = new Date();
            await this.payoutRepository.save(payout);
            this.logger.log(
              `Reconciliation healed payout ${payout.id} → COMPLETED`,
            );
          } else if (
            !onChainStatus.successful &&
            payout.status === PayoutStatus.PROCESSING
          ) {
            // On-chain says failed but DB shows processing
            discrepancies.push(
              `Payout ${payout.id}: on-chain failed but DB status=${payout.status}`,
            );
            this.logger.warn(
              `Reconciliation discrepancy — payout ${payout.id}: ` +
                `DB status=${payout.status}, on-chain=FAILED`,
            );
          }
        } catch (err) {
          this.logger.error(
            `Reconciliation check failed for payout ${payout.id}: ${err.message}`,
          );
        }
      }

      // Step 3: Log summary
      if (discrepancies.length > 0) {
        this.logger.warn(
          `Reconciliation complete — ${discrepancies.length} discrepancies found:\n` +
            discrepancies.join('\n'),
        );
      } else {
        this.logger.log(
          `Reconciliation complete — all ${submittedPayouts.length} payouts consistent`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Reconciliation job failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Fetches on-chain transaction status from Stellar Horizon.
   * In development/test mode, returns a mock successful result.
   */
  private async fetchOnChainStatus(
    transactionHash: string,
  ): Promise<{ found: boolean; successful: boolean }> {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'development' || nodeEnv === 'test') {
      // In dev/test, treat all known hashes as successful
      return { found: true, successful: true };
    }

    try {
      const response = await fetch(
        `${this.horizonUrl}/transactions/${transactionHash}`,
      );

      if (response.status === 404) {
        return { found: false, successful: false };
      }

      if (!response.ok) {
        throw new Error(`Horizon returned status ${response.status}`);
      }

      const data = await response.json();
      return {
        found: true,
        successful: data.successful === true,
      };
    } catch (err) {
      throw new Error(`Failed to fetch on-chain status: ${err.message}`);
    }
  }
}
