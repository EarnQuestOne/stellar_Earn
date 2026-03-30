import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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

export interface ScanResult {
  score: number;
  keywordHits: string[];
  labels: Record<string, number>;
  imageFlags: { url: string; reason: string }[];
  shouldBlock: boolean;
  shouldManualReview: boolean;
}

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
    private readonly configService: ConfigService,
  ) {}

  private highThreshold(): number {
    return this.configService.get<number>('moderation.highThreshold') ?? 0.85;
  }

  private mediumThreshold(): number {
    return this.configService.get<number>('moderation.mediumThreshold') ?? 0.5;
  }

  private blockOnHigh(): boolean {
    const v = this.configService.get<boolean | undefined>(
      'moderation.blockOnHighSeverity',
    );
    return v !== false;
  }

  async scanText(text: string): Promise<ScanResult> {
    const combined = text || '';
    const kw = this.keywordFilter.scan(combined);
    const cls = this.classifier.classify(combined);
    const external = await this.externalApi.scoreText(combined);

    let score = Math.max(
      kw.blocked ? 1 : 0,
      cls.score,
      external?.score ?? 0,
    );

    if (kw.hits.length) {
      score = Math.max(score, 0.95);
    }

    const labels = {
      ...cls.labels,
      ...(external?.categories || {}),
    };

    const high = this.highThreshold();
    const med = this.mediumThreshold();

    return {
      score,
      keywordHits: kw.hits,
      labels: labels as Record<string, number>,
      imageFlags: [],
      shouldBlock: this.blockOnHigh() && score >= high,
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
    const text = typeof proof === 'object' && proof !== null
      ? JSON.stringify(proof).slice(0, 50000)
      : String(proof ?? '');

    const urls = this.imageModeration.extractUrlsFromProof(proof);
    const imageFlags = await this.imageModeration.moderateUrls(urls);

    const scan = await this.scanText(text);
    const combinedScore = Math.max(
      scan.score,
      imageFlags.length > 0 ? 0.75 : 0,
    );

    if (scan.shouldBlock || imageFlags.some((f) => f.reason === 'blocked_host')) {
      throw new BadRequestException({
        message: 'Submission content violates platform moderation rules',
        code: 'MODERATION_BLOCKED',
        keywordHits: scan.keywordHits,
        imageFlags,
      });
    }

    const needsManual =
      scan.shouldManualReview || imageFlags.length > 0 || combinedScore >= this.mediumThreshold();

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

  async listPending(page = 1, limit = 20) {
    const [items, total] = await this.itemRepo.findAndCount({
      where: { status: ModerationItemStatus.MANUAL_REVIEW },
      order: { priority: 'DESC', createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getDashboardStats() {
    const pending = await this.itemRepo.count({
      where: { status: ModerationItemStatus.MANUAL_REVIEW },
    });
    const appeals = await this.appealRepo.count({
      where: { status: AppealStatus.PENDING },
    });
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
      throw new ForbiddenException('You can only appeal your own moderation cases');
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
