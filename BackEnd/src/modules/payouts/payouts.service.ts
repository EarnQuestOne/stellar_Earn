import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Payout, PayoutStatus, PayoutType } from './entities/payout.entity';
import { ClaimPayoutDto, CreatePayoutDto } from './dto/claim-payout.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayoutProcessedEvent } from '../../events/dto/payout-processed.event';
import { PayoutFailedEvent } from '../../events/dto/payout-failed.event';
import {
  PayoutQueryDto,
  PayoutHistoryResponseDto,
  PayoutResponseDto,
  PayoutStatsDto,
} from './dto/payout-query.dto';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import {
  encodeCursor,
  decodeCursor,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';
import { QuotaService } from '../quota/quota.service';
import { MetricsService } from '../../common/services/metrics.service';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';
import { BulkheadService } from '../../common/services/bulkhead.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);
  private readonly settlementRetryDelayMs = 60_000;
  private readonly maxAutomaticPayoutRetries = 5;
  private readonly payoutRetryBaseDelayMs = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly fraudRiskRulesService: FraudRiskRulesService,
    private readonly quotaService: QuotaService,
    private readonly metricsService: MetricsService,
    private readonly jobsService: JobsService,
    private readonly bulkheadService: BulkheadService,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async createPayout(createPayoutDto: CreatePayoutDto): Promise<Payout> {
    return this.bulkheadService.runWithBulkhead(
      'payouts',
      async () => {
        await this.quotaService.enforcePayoutQuota(
          createPayoutDto.stellarAddress,
          createPayoutDto.amount,
        );

        const payout = this.payoutRepository.create({
          stellarAddress: createPayoutDto.stellarAddress,
          amount: createPayoutDto.amount,
          asset: createPayoutDto.asset || 'XLM',
          type: createPayoutDto.type || PayoutType.QUEST_REWARD,
          questId: createPayoutDto.questId,
          submissionId: createPayoutDto.submissionId,
          status: PayoutStatus.PENDING,
          maxRetries: this.maxAutomaticPayoutRetries,
        });

        return this.payoutRepository.save(payout);
      },
      this.getPayoutBulkheadOptions(),
    );
  }

  // ─── Claim ─────────────────────────────────────────────────────────────────

  async claimPayout(
    claimPayoutDto: ClaimPayoutDto,
    userAddress: string,
  ): Promise<PayoutResponseDto> {
    return this.bulkheadService.runWithBulkhead(
      'payouts',
      async () => {
        const payout = await this.payoutRepository.findOne({
          where: {
            submissionId: claimPayoutDto.submissionId,
            stellarAddress: userAddress,
          },
        });

        if (!payout) {
          throw new NotFoundException('Payout not found for this submission');
        }

        if (!payout.isClaimable()) {
          throw new BadRequestException(
            `Payout cannot be claimed. Current status: ${payout.status}`,
          );
        }

        if (payout.stellarAddress !== claimPayoutDto.stellarAddress) {
          throw new BadRequestException('Stellar address mismatch');
        }

        payout.claimedAt = new Date();
        payout.status = PayoutStatus.PROCESSING;
        await this.payoutRepository.save(payout);

        this.processPayout(payout.id).catch((error) => {
          this.logger.error(`Failed to process payout ${payout.id}`, error);
        });

        return this.mapToResponse(payout);
      },
      this.getPayoutBulkheadOptions(),
    );
  }

  // ─── Process ───────────────────────────────────────────────────────────────

  async processPayout(payoutId: string): Promise<void> {
    return this.bulkheadService.runWithBulkhead(
      'payouts',
      async () => {
        const payout = await this.payoutRepository.findOne({
          where: { id: payoutId },
        });

        if (!payout) {
          throw new NotFoundException(`Payout ${payoutId} not found`);
        }

        if (payout.status !== PayoutStatus.PROCESSING) {
          this.logger.warn(
            `Payout ${payoutId} is not in PROCESSING status, skipping`,
          );
          return;
        }

        if (payout.transactionHash && payout.stellarLedger) {
          await this.confirmSettlementFinality(payout);
          return;
        }

        try {
          const result = await this.executeStellarPayment(payout);
          payout.transactionHash = result.transactionHash;
          payout.stellarLedger = result.ledger;
          payout.failureReason = null;

          const settlement = await this.getSettlementConfirmationState(
            result.ledger,
          );

          payout.settlementConfirmations = settlement.confirmations;

          if (!settlement.isFinal) {
            payout.status = PayoutStatus.PROCESSING;
            payout.nextRetryAt = new Date(Date.now() + this.settlementRetryDelayMs);
            await this.payoutRepository.save(payout);
            this.logger.log(
              `Payout ${payoutId} submitted and waiting for settlement finality (${settlement.confirmations}/${settlement.requiredConfirmations} confirmations)`,
            );
            return;
          }

          this.markPayoutCompleted(payout);
          await this.payoutRepository.save(payout);
          this.logger.log(`Payout ${payoutId} completed successfully`);

          this.emitPayoutProcessed(payout);
        } catch (error) {
          if (payout.transactionHash && payout.stellarLedger) {
            payout.status = PayoutStatus.PROCESSING;
            payout.failureReason =
              error.message || 'Settlement confirmation failed';
            payout.nextRetryAt = new Date(Date.now() + this.settlementRetryDelayMs);
            await this.payoutRepository.save(payout);
            this.logger.warn(
              `Payout ${payout.id} transaction submitted but settlement confirmation is unavailable; retry scheduled`,
            );
            return;
          }

          this.eventEmitter.emit(
            'payout.failed',
            new PayoutFailedEvent(payout.id, payout.stellarAddress, error.message),
          );
          await this.handlePayoutFailure(payout, error);
        }
      },
      this.getPayoutBulkheadOptions(),
    );
  }

  private getPayoutBulkheadOptions() {
    return {
      maxConcurrent: Number(
        this.configService.get<number | string>(
          'PAYOUT_BULKHEAD_MAX_CONCURRENT',
          5,
        ),
      ),
      maxQueueSize: Number(
        this.configService.get<number | string>(
          'PAYOUT_BULKHEAD_MAX_QUEUE_SIZE',
          20,
        ),
      ),
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async confirmPendingSettlements(): Promise<void> {
    const pendingSettlements = await this.payoutRepository.find({
      where: {
        status: PayoutStatus.PROCESSING,
        nextRetryAt: LessThanOrEqual(new Date()),
      },
      take: 10,
    });

    const submittedPayouts = pendingSettlements.filter(
      (payout) => payout.transactionHash && payout.stellarLedger,
    );

    if (submittedPayouts.length === 0) return;

    this.logger.log(
      `Checking settlement finality for ${submittedPayouts.length} payouts`,
    );

    for (const payout of submittedPayouts) {
      try {
        await this.confirmSettlementFinality(payout);
      } catch (error) {
        this.logger.error(
          `Settlement confirmation failed for payout ${payout.id}`,
          error,
        );
      }
    }
  }

  private async confirmSettlementFinality(payout: Payout): Promise<void> {
    if (!payout.stellarLedger) {
      throw new Error(`Payout ${payout.id} is missing its settlement ledger`);
    }

    const settlement = await this.getSettlementConfirmationState(
      payout.stellarLedger,
    );

    payout.settlementConfirmations = settlement.confirmations;

    if (!settlement.isFinal) {
      payout.nextRetryAt = new Date(Date.now() + this.settlementRetryDelayMs);
      await this.payoutRepository.save(payout);
      this.logger.log(
        `Payout ${payout.id} settlement still pending (${settlement.confirmations}/${settlement.requiredConfirmations} confirmations)`,
      );
      return;
    }

    this.markPayoutCompleted(payout);
    await this.payoutRepository.save(payout);
    this.emitPayoutProcessed(payout);
    this.logger.log(`Payout ${payout.id} settlement finality confirmed`);
  }

  private async getSettlementConfirmationState(
    submittedLedger: number,
  ): Promise<{
    confirmations: number;
    requiredConfirmations: number;
    isFinal: boolean;
  }> {
    const configuredConfirmations = Number(
      this.configService.get<number | string>(
        'STELLAR_FINALITY_CONFIRMATIONS',
        3,
      ),
    );
    const requiredConfirmations = Math.max(
      1,
      Number.isFinite(configuredConfirmations) ? configuredConfirmations : 3,
    );
    const currentLedger = await this.getCurrentStellarLedger();
    const confirmations = Math.max(0, currentLedger - submittedLedger + 1);

    return {
      confirmations,
      requiredConfirmations,
      isFinal: confirmations >= requiredConfirmations,
    };
  }

  private async getCurrentStellarLedger(): Promise<number> {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const mockLedger = Number(
      this.configService.get<number | string>('STELLAR_MOCK_CURRENT_LEDGER'),
    );

    if (Number.isInteger(mockLedger) && mockLedger > 0) {
      return mockLedger;
    }

    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return Number.MAX_SAFE_INTEGER;
    }

    const horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      this.configService.get<string>('HORIZON_URL') ||
      'https://horizon.stellar.org';

    const response = await fetch(`${horizonUrl}/ledgers?order=desc&limit=1`);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Unable to confirm Stellar settlement finality',
      );
    }

    const payload = await response.json();
    const latestLedger = Number(payload?._embedded?.records?.[0]?.sequence);

    if (!Number.isInteger(latestLedger) || latestLedger <= 0) {
      throw new ServiceUnavailableException(
        'Stellar ledger response did not include a valid ledger sequence',
      );
    }

    return latestLedger;
  }

  private markPayoutCompleted(payout: Payout): void {
    payout.status = PayoutStatus.COMPLETED;
    payout.processedAt = new Date();
    payout.settlementConfirmedAt = new Date();
    payout.nextRetryAt = null;
  }

  private emitPayoutProcessed(payout: Payout): void {
    this.eventEmitter.emit(
      'payout.processed',
      new PayoutProcessedEvent(
        payout.id,
        payout.stellarAddress,
        payout.amount.toString(),
        payout.transactionHash ?? '',
      ),
    );
  }

  // ─── Stellar ───────────────────────────────────────────────────────────────

  private async executeStellarPayment(
    payout: Payout,
  ): Promise<{ transactionHash: string; ledger: number }> {
    const stellarNetwork = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'development' || nodeEnv === 'test') {
      await new Promise((resolve) =>
        setTimeout(resolve, nodeEnv === 'test' ? 10 : 1000),
      );
      return {
        transactionHash: `mock_tx_${Date.now()}_${payout.id.substring(0, 8)}`,
        ledger: Math.floor(Math.random() * 1000000) + 50000000,
      };
    }

    const sourceSecretKey = this.configService.get<string>(
      'STELLAR_SOURCE_SECRET_KEY',
    );

    if (!sourceSecretKey) {
      throw new Error('Stellar source secret key not configured');
    }

    this.logger.log(
      `Executing Stellar payment: ${payout.amount} ${payout.asset} to ${payout.stellarAddress} on ${stellarNetwork}`,
    );

    throw new Error('Stellar payment not implemented for production');
  }

  // ─── Failure / retry ───────────────────────────────────────────────────────

  private async handlePayoutFailure(
    payout: Payout,
    error: Error,
  ): Promise<void> {
    const errorMessage = error.message || 'Unknown error';
    this.logger.error(`Payout ${payout.id} failed: ${errorMessage}`);

    payout.retryCount += 1;
    payout.maxRetries = this.maxAutomaticPayoutRetries;
    payout.failureReason = errorMessage;

    if (this.shouldRetryPayout(payout)) {
      payout.nextRetryAt = new Date(
        Date.now() + this.getPayoutRetryDelayMs(payout.retryCount),
      );
      payout.status = PayoutStatus.RETRY_SCHEDULED;
      this.recordPayoutFailureMetric(payout, 'retry_scheduled');
      this.logger.log(
        `Payout ${payout.id} scheduled for retry at ${String(payout.nextRetryAt)}`,
      );
    } else {
      payout.status = PayoutStatus.DEAD_LETTER;
      payout.nextRetryAt = null;
      await this.enqueuePayoutDeadLetter(payout, errorMessage);
      this.emitPayoutDeadLettered(payout, errorMessage);
      this.recordPayoutFailureMetric(payout, 'dead_letter');
      this.logger.error(
        `Payout ${payout.id} moved to dead letter after ${payout.retryCount} attempts`,
      );
    }

    await this.payoutRepository.save(payout);
  }

  private shouldRetryPayout(payout: Payout): boolean {
    return payout.retryCount < this.maxAutomaticPayoutRetries;
  }

  private getPayoutRetryDelayMs(retryCount: number): number {
    const exponent = Math.max(0, retryCount - 1);
    return Math.pow(2, exponent) * this.payoutRetryBaseDelayMs;
  }

  private async enqueuePayoutDeadLetter(
    payout: Payout,
    errorMessage: string,
  ): Promise<void> {
    try {
      await this.jobsService.addJob(
        QUEUES.DEAD_LETTER,
        {
          failedJob: {
            id: payout.id,
            name: 'payout.settlement',
            failedReason: errorMessage,
            data: {
              payoutId: payout.id,
              asset: payout.asset,
              retryCount: payout.retryCount,
            },
          },
        },
        {
          jobId: `payout-${payout.id}-dead-letter`,
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    } catch (deadLetterError) {
      this.logger.error(
        `Failed to enqueue dead-letter entry for payout ${payout.id}`,
        deadLetterError,
      );
    }
  }

  private emitPayoutDeadLettered(payout: Payout, reason: string): void {
    this.eventEmitter.emit('payout.dead_lettered', {
      payoutId: payout.id,
      asset: payout.asset,
      retryCount: payout.retryCount,
      reason,
      deadLetteredAt: new Date(),
    });
  }

  private recordPayoutFailureMetric(
    payout: Payout,
    outcome: 'retry_scheduled' | 'dead_letter',
  ): void {
    const labels = { asset: payout.asset, outcome };
    this.metricsService.incrementCounter('payout_failures_total', labels);

    if (outcome === 'dead_letter') {
      this.metricsService.incrementCounter('payout_dead_letter_total', {
        asset: payout.asset,
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledRetries(): Promise<void> {
    const payoutsToRetry = await this.payoutRepository.find({
      where: {
        status: PayoutStatus.RETRY_SCHEDULED,
        nextRetryAt: LessThanOrEqual(new Date()),
      },
      take: 10,
    });

    if (payoutsToRetry.length === 0) return;

    this.logger.log(`Processing ${payoutsToRetry.length} scheduled retries`);

    for (const payout of payoutsToRetry) {
      payout.status = PayoutStatus.PROCESSING;
      await this.payoutRepository.save(payout);

      this.processPayout(payout.id).catch((error) => {
        this.logger.error(`Retry failed for payout ${payout.id}`, error);
      });
    }
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────

  async getPayoutById(
    payoutId: string,
    userAddress?: string,
  ): Promise<PayoutResponseDto> {
    const whereClause: Record<string, unknown> = { id: payoutId };
    if (userAddress) whereClause.stellarAddress = userAddress;

    const payout = await this.payoutRepository.findOne({
      where: whereClause,
    });

    if (!payout) throw new NotFoundException('Payout not found');

    return this.mapToResponse(payout);
  }

  // ─── List (cursor-paginated) ───────────────────────────────────────────────

  /**
   * Returns cursor-paginated payout history.
   *
   * Replaces the old offset-based implementation that used:
   *   skip: (page - 1) * limit, take: limit
   *
   * Cursor encodes { id, createdAt } so the page boundary is stable even
   * when new payouts are inserted between requests.
   */
  async getPayoutHistory(
    query: PayoutQueryDto,
    userAddress?: string,
  ): Promise<PayoutHistoryResponseDto> {
    const limit = query.limit ?? 20;
    const address = query.stellarAddress || userAddress;

    const qb = this.payoutRepository.createQueryBuilder('payout');

    // ── Base filters ──────────────────────────────────────────────────────────
    if (address) {
      qb.andWhere('payout.stellarAddress = :address', { address });
    }
    if (query.status) {
      qb.andWhere('payout.status = :status', { status: query.status });
    }
    if (query.type) {
      qb.andWhere('payout.type = :type', { type: query.type });
    }

    // ── Cursor filter ─────────────────────────────────────────────────────────
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (decoded?.createdAt && decoded?.id) {
        // Compound condition: same-millisecond rows are broken by id
        qb.andWhere(
          '(payout.createdAt < :cv OR (payout.createdAt = :cv AND payout.id < :idv))',
          { cv: decoded.createdAt, idv: decoded.id },
        );
      }
    }

    // ── Order + fetch limit+1 to detect next page ─────────────────────────────
    qb.orderBy('payout.createdAt', 'DESC')
      .addOrderBy('payout.id', 'DESC')
      .take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    const result = new PaginatedResponseDto<PayoutResponseDto>(
      data.map((p) => this.mapToResponse(p)),
      nextCursor,
    );

    // Cast is safe — PayoutHistoryResponseDto extends PaginatedResponseDto<PayoutResponseDto>
    return result;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getPayoutStats(stellarAddress?: string): Promise<PayoutStatsDto> {
    const baseQuery = this.payoutRepository.createQueryBuilder('payout');

    if (stellarAddress) {
      baseQuery.where('payout.stellarAddress = :address', {
        address: stellarAddress,
      });
    }

    const stats = await baseQuery
      .select([
        'COUNT(*) as "totalPayouts"',
        'COALESCE(SUM(payout.amount), 0) as "totalAmount"',
        'COUNT(CASE WHEN payout.status = :pending THEN 1 END) as "pendingPayouts"',
        'COALESCE(SUM(CASE WHEN payout.status = :pending THEN payout.amount ELSE 0 END), 0) as "pendingAmount"',
        'COUNT(CASE WHEN payout.status = :completed THEN 1 END) as "completedPayouts"',
        'COALESCE(SUM(CASE WHEN payout.status = :completed THEN payout.amount ELSE 0 END), 0) as "completedAmount"',
        'COUNT(CASE WHEN payout.status IN (:...failedStatuses) THEN 1 END) as "failedPayouts"',
      ])
      .setParameters({
        pending: PayoutStatus.PENDING,
        completed: PayoutStatus.COMPLETED,
        failedStatuses: [PayoutStatus.FAILED, PayoutStatus.DEAD_LETTER],
      })
      .getRawOne();

    return {
      total: parseInt(stats.totalPayouts, 10),
      totalAmount: parseFloat(stats.totalAmount),
      pendingCount: parseInt(stats.pendingPayouts, 10),
      completedCount: parseInt(stats.completedPayouts, 10),
      failedCount: parseInt(stats.failedPayouts, 10),
      asset: 'XLM',
    };
  }

  // ─── Admin retry ───────────────────────────────────────────────────────────

  async retryPayout(payoutId: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) throw new NotFoundException('Payout not found');

    if (
      ![PayoutStatus.FAILED, PayoutStatus.DEAD_LETTER].includes(payout.status)
    ) {
      throw new BadRequestException('Only failed payouts can be retried');
    }

    payout.retryCount = 0;
    payout.maxRetries = this.maxAutomaticPayoutRetries;
    payout.status = PayoutStatus.PROCESSING;
    payout.failureReason = null;
    await this.payoutRepository.save(payout);

    this.processPayout(payout.id).catch((error) => {
      this.logger.error(`Manual retry failed for payout ${payout.id}`, error);
    });

    return this.mapToResponse(payout);
  }

  // ─── Mapper ────────────────────────────────────────────────────────────────

  private mapToResponse(payout: Payout): PayoutResponseDto {
    return {
      id: payout.id,
      stellarAddress: payout.stellarAddress,
      amount: Number(payout.amount),
      asset: payout.asset,
      status: payout.status,
      type: payout.type,
      questId: payout.questId,
      submissionId: payout.submissionId,
      transactionHash: payout.transactionHash,
      stellarLedger: payout.stellarLedger,
      settlementConfirmations: payout.settlementConfirmations,
      settlementConfirmedAt: payout.settlementConfirmedAt,
      failureReason: payout.failureReason,
      retryCount: payout.retryCount,
      processedAt: payout.processedAt,
      claimedAt: payout.claimedAt,
      createdAt: payout.createdAt,
    };
  }
}
