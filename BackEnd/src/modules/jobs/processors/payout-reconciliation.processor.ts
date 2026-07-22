import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payout, PayoutStatus } from '../../payouts/entities/payout.entity';
import { JobLogService } from '../services/job-log.service';

/**
 * Payout Reconciliation Processor
 * BE-141: Adds a scheduled job that checks consistency between
 * off-chain DB records and on-chain Stellar transaction status.
 */
@Injectable()
export class PayoutReconciliationProcessor {
  private readonly logger = new Logger(PayoutReconciliationProcessor.name);
  private readonly horizonUrl: string;

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    private readonly configService: ConfigService,
    private readonly jobLogService: JobLogService,
  ) {
    this.horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      this.configService.get<string>('HORIZON_URL') ||
      'https://horizon.stellar.org';
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
