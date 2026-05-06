import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
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
import {
  encodeCursor,
  decodeCursor,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async createPayout(createPayoutDto: CreatePayoutDto): Promise<Payout> {
    const payout = this.payoutRepository.create({
      stellarAddress: createPayoutDto.stellarAddress,
      amount: createPayoutDto.amount,
      asset: createPayoutDto.asset || 'XLM',
      type: createPayoutDto.type || PayoutType.QUEST_REWARD,
      questId: createPayoutDto.questId,
      submissionId: createPayoutDto.submissionId,
      status: PayoutStatus.PENDING,
    });

    return this.payoutRepository.save(payout);
  }

  // ─── Claim ─────────────────────────────────────────────────────────────────

  async claimPayout(
    claimPayoutDto: ClaimPayoutDto,
    userAddress: string,
  ): Promise<PayoutResponseDto> {
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
  }

  // ─── Process ───────────────────────────────────────────────────────────────

  async processPayout(payoutId: string): Promise<void> {
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

    try {
      const result = await this.executeStellarPayment(payout);

      payout.status = PayoutStatus.COMPLETED;
      payout.transactionHash = result.transactionHash;
      payout.stellarLedger = result.ledger;
      payout.processedAt = new Date();
      payout.failureReason = null;

      await this.payoutRepository.save(payout);
      this.logger.log(`Payout ${payoutId} completed successfully`);

      this.eventEmitter.emit(
        'payout.processed',
        new PayoutProcessedEvent(
          payout.id,
          payout.stellarAddress,
          payout.amount.toString(),
          result.transactionHash,
        ),
      );
    } catch (error) {
      this.eventEmitter.emit(
        'payout.failed',
        new PayoutFailedEvent(payout.id, payout.stellarAddress, error.message),
      );
      await this.handlePayoutFailure(payout, error);
    }
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
    payout.failureReason = errorMessage;

    if (payout.canRetry()) {
      const delayMinutes = Math.pow(2, payout.retryCount) * 5;
      payout.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
      payout.status = PayoutStatus.RETRY_SCHEDULED;
      this.logger.log(
        `Payout ${payout.id} scheduled for retry at ${payout.nextRetryAt}`,
      );
    } else {
      payout.status = PayoutStatus.FAILED;
      this.logger.error(
        `Payout ${payout.id} failed permanently after ${payout.retryCount} attempts`,
      );
    }

    await this.payoutRepository.save(payout);
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
    return result as PayoutHistoryResponseDto;
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
        'COUNT(CASE WHEN payout.status = :failed THEN 1 END) as "failedPayouts"',
      ])
      .setParameters({
        pending: PayoutStatus.PENDING,
        completed: PayoutStatus.COMPLETED,
        failed: PayoutStatus.FAILED,
      })
      .getRawOne();

    return {
      totalPayouts: parseInt(stats.totalPayouts, 10),
      totalAmount: parseFloat(stats.totalAmount),
      pendingPayouts: parseInt(stats.pendingPayouts, 10),
      pendingAmount: parseFloat(stats.pendingAmount),
      completedPayouts: parseInt(stats.completedPayouts, 10),
      completedAmount: parseFloat(stats.completedAmount),
      failedPayouts: parseInt(stats.failedPayouts, 10),
    };
  }

  // ─── Admin retry ───────────────────────────────────────────────────────────

  async retryPayout(payoutId: string): Promise<PayoutResponseDto> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    });

    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException('Only failed payouts can be retried');
    }

    payout.retryCount = 0;
    payout.maxRetries = 3;
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
      failureReason: payout.failureReason,
      retryCount: payout.retryCount,
      processedAt: payout.processedAt,
      claimedAt: payout.claimedAt,
      createdAt: payout.createdAt,
    };
  }
}