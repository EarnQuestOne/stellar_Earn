import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ModerationItem,
  ModerationTargetType,
  ModerationItemStatus,
  ModerationAction,
} from './entities/moderation-item.entity';
import {
  ModerationAppeal,
  AppealStatus,
} from './entities/moderation-appeal.entity';
import { KeywordFilterService } from './filters/keyword-filter.service';
import { ContentClassifierService } from './filters/content-classifier.service';
import { ImageModerationService } from './filters/image-moderation.service';
import { ExternalModerationApiService } from './filters/external-moderation-api.service';
import {
  ModerationConfigCacheService,
  ModerationConfigSnapshot,
} from './moderation-config-cache.service';

export interface ScanResult {
  score: number;
  keywordHits: string[];
  labels: Record<string, number>;
  imageFlags: { url: string; reason: string }[];
  shouldBlock: boolean;
  shouldManualReview: boolean;
}

// Defense-in-depth cap on page size, independent of DTO validation at the
// controller boundary. Keeps listPending/listAppealsPending safe even if
// called with unvalidated input (e.g. directly, or from a future caller
// that bypasses the controller's ValidationPipe).
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(ModerationItem)
    private readonly itemRepo: Repository<ModerationItem>,
    @InjectRepository(ModerationAppeal)
    private readonly appealRepo: Repository<ModerationAppeal>,
    private readonly keywordFilter: KeywordFilterService,
    private readonly classifier: ContentClassifierService,
    private readonly imageModeration: ImageModerationService,
    private readonly externalApi: ExternalModerationApiService,
    private readonly moderationConfig: ModerationConfigCacheService,
  ) {}

  async scanText(text: string): Promise<ScanResult> {
    return this.scanTextWithConfig(text, this.moderationConfig.getConfig());
  }

  private async scanTextWithConfig(
    text: string,
    config: Readonly<ModerationConfigSnapshot>,
  ): Promise<ScanResult> {
    const combined = text || '';
    const kw = this.keywordFilter.scan(combined, config.blockedKeywords);
    const cls = this.classifier.classify(combined);
    const external = await this.externalApi.scoreText(combined, config);

    let score = Math.max(kw.blocked ? 1 : 0, cls.score, external?.score ?? 0);

    if (kw.hits.length) {
      score = Math.max(score, 0.95);
    }

    const labels = {
      ...cls.labels,
      ...(external?.categories || {}),
    };

    const high = config.highThreshold;
    const med = config.mediumThreshold;

    return {
      score,
      keywordHits: kw.hits,
      labels: labels,
      imageFlags: [],
      shouldBlock: config.blockOnHighSeverity && score >= high,
      shouldManualReview: score >= med && score < high,
    };
  }

  /**
   * Persist moderation audit row for a quest after it has been saved and `scan` has been run.
   */
  async saveQuestModerationItem(
    questId: string,
    userId: string,
    title: string,
    description: string,
    scan: ScanResult,
  ): Promise<ModerationItem> {
    const text = `${title}\n\n${description}`;
    const status = scan.shouldManualReview
      ? ModerationItemStatus.MANUAL_REVIEW
      : ModerationItemStatus.AUTO_APPROVED;

    const item = this.itemRepo.create({
      targetType: ModerationTargetType.QUEST,
      targetId: questId,
      userId,
      textSnapshot: text.slice(0, 32000),
      imageUrls: null,
      automatedScore: scan.score,
      automatedLabels: scan.labels,
      keywordHits: scan.keywordHits,
      imageFlags: scan.imageFlags,
      status,
      priority: scan.shouldManualReview ? 10 : 0,
      lastAction: ModerationAction.NONE,
    });

    return this.itemRepo.save(item);
  }

  async scanSubmissionContent(
    submissionId: string,
    userId: string,
    proof: unknown,
  ): Promise<ModerationItem> {
    const config = this.moderationConfig.getConfig();
    const text =
      typeof proof === 'object' && proof !== null
        ? JSON.stringify(proof).slice(0, 50000)
        : String((proof as string | number | boolean | null | undefined) ?? '');

    const urls = this.imageModeration.extractUrlsFromProof(proof);
    const imageFlags = await this.imageModeration.moderateUrls(urls, config);

    const scan = await this.scanTextWithConfig(text, config);
    const combinedScore = Math.max(
      scan.score,
      imageFlags.length > 0 ? 0.75 : 0,
    );

    if (
      scan.shouldBlock ||
      imageFlags.some((f) => f.reason === 'blocked_host')
    ) {
      throw new BadRequestException({
        message: 'Submission content violates platform moderation rules',
        code: 'MODERATION_BLOCKED',
        keywordHits: scan.keywordHits,
        imageFlags,
      });
    }

    const needsManual =
      scan.shouldManualReview ||
      imageFlags.length > 0 ||
      combinedScore >= config.mediumThreshold;

    const item = this.itemRepo.create({
      targetType: ModerationTargetType.SUBMISSION,
      targetId: submissionId,
      userId,
      textSnapshot: text.slice(0, 32000),
      imageUrls: urls.length ? urls : null,
      automatedScore: combinedScore,
      automatedLabels: scan.labels,
      keywordHits: scan.keywordHits,
      imageFlags: imageFlags.length ? imageFlags : null,
      status: needsManual
        ? ModerationItemStatus.MANUAL_REVIEW
        : ModerationItemStatus.AUTO_APPROVED,
      priority: needsManual ? 8 : 0,
      lastAction: ModerationAction.NONE,
    });

    return this.itemRepo.save(item);
  }

  /**
   * Clamps page/limit to sane bounds so callers can't request unbounded
   * page sizes, regardless of whether DTO validation ran upstream.
   */
  private clampPagination(
    page: number,
    limit: number,
  ): { page: number; limit: number } {
    const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit >= 1
        ? Math.min(Math.floor(limit), MAX_PAGE_LIMIT)
        : DEFAULT_PAGE_LIMIT;
    return { page: safePage, limit: safeLimit };
  }

  async listPending(
    page = 1,
    limit = 20,
    cursor?: string,
  ): Promise<{
    items: ModerationItem[];
    total: number;
    page?: number;
    limit: number;
    nextCursor?: string;
  }> {
    ({ page, limit } = this.clampPagination(page, limit));

    // Keyset (cursor) pagination when a cursor is provided.
    if (cursor) {
      const [cursorPriority, cursorCreatedAt, cursorId] =
        cursor.split('::').map(Number);
      const items = await this.itemRepo
        .createQueryBuilder('item')
        .where('item.status = :status', {
          status: ModerationItemStatus.MANUAL_REVIEW,
        })
        .andWhere(
          '(item.priority < :cp OR (item.priority = :cp AND item.createdAt > :cra))',
          {
            cp: cursorPriority,
            cra: new Date(cursorCreatedAt),
          },
        )
        .orderBy('item.priority', 'DESC')
        .addOrderBy('item.createdAt', 'ASC')
        .take(limit + 1) // fetch one extra to detect if there's a next page
        .getMany();

      const hasMore = items.length > limit;
      const pageItems = hasMore ? items.slice(0, limit) : items;
      const lastItem = pageItems[pageItems.length - 1];
      const nextCursor = hasMore
        ? `${lastItem.priority}::${lastItem.createdAt.getTime()}::${lastItem.id}`
        : undefined;

      return { items: pageItems, total: pageItems.length, limit, nextCursor };
    }

    // Fallback to offset pagination.
    const [items, total] = await this.itemRepo.findAndCount({
      where: { status: ModerationItemStatus.MANUAL_REVIEW },
      order: { priority: 'DESC', createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getDashboardStats() {
    // #2033: Run count queries in parallel
    const [pending, appeals] = await Promise.all([
      this.itemRepo.count({
        where: { status: ModerationItemStatus.MANUAL_REVIEW },
      }),
      this.appealRepo.count({
        where: { status: AppealStatus.PENDING },
      }),
    ]);
    return { pendingManualReview: pending, pendingAppeals: appeals };
  }

  async applyAction(
    itemId: string,
    action: ModerationAction,
    reviewerId: string,
    notes?: string,
  ): Promise<ModerationItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Moderation item not found');
    }

    if (action === ModerationAction.ESCALATE) {
      item.priority = Math.min(100, item.priority + 20);
      item.notes = notes ?? item.notes;
      item.lastAction = action;
      return this.itemRepo.save(item);
    }

    if (action === ModerationAction.APPROVE) {
      item.status = ModerationItemStatus.APPROVED;
    } else if (action === ModerationAction.REJECT) {
      item.status = ModerationItemStatus.REJECTED;
    }

    item.reviewedBy = reviewerId;
    item.reviewedAt = new Date();
    item.lastAction = action;
    item.notes = notes ?? item.notes;

    return this.itemRepo.save(item);
  }

  async createAppeal(userId: string, itemId: string, message: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Moderation item not found');
    }
    if (item.userId !== userId) {
      throw new ForbiddenException(
        'You can only appeal your own moderation cases',
      );
    }

    const appeal = this.appealRepo.create({
      moderationItemId: itemId,
      userId,
      message,
      status: AppealStatus.PENDING,
    });
    return this.appealRepo.save(appeal);
  }

  async listAppealsPending(page = 1, limit = 20) {
    ({ page, limit } = this.clampPagination(page, limit));
    const [appeals, total] = await this.appealRepo.findAndCount({
      where: { status: AppealStatus.PENDING },
      order: { createdAt: 'ASC' },
      relations: ['moderationItem'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { appeals, total, page, limit };
  }

  async resolveAppeal(
    appealId: string,
    resolution: AppealStatus.APPROVED | AppealStatus.REJECTED,
    resolverId: string,
    note?: string,
  ) {
    const appeal = await this.appealRepo.findOne({
      where: { id: appealId },
      relations: ['moderationItem'],
    });
    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }
    if (appeal.status !== AppealStatus.PENDING) {
      throw new BadRequestException('Appeal already resolved');
    }

    appeal.status = resolution;
    appeal.resolvedBy = resolverId;
    appeal.resolvedAt = new Date();
    appeal.resolutionNote = note ?? null;

    if (resolution === AppealStatus.APPROVED && appeal.moderationItem) {
      appeal.moderationItem.status = ModerationItemStatus.APPROVED;
      appeal.moderationItem.reviewedBy = resolverId;
      appeal.moderationItem.reviewedAt = new Date();
      appeal.moderationItem.lastAction = ModerationAction.APPROVE;
      await this.itemRepo.save(appeal.moderationItem);
    }

    return this.appealRepo.save(appeal);
  }
}
