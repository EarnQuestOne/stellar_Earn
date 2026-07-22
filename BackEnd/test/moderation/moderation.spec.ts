import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ModerationService } from '#src/modules/moderation/moderation.service';
import {
  ModerationItem,
  ModerationItemStatus,
  ModerationAction,
} from '#src/modules/moderation/entities/moderation-item.entity';
import {
  ModerationAppeal,
  AppealStatus,
} from '#src/modules/moderation/entities/moderation-appeal.entity';
import { KeywordFilterService } from '#src/modules/moderation/filters/keyword-filter.service';
import { ContentClassifierService } from '#src/modules/moderation/filters/content-classifier.service';
import { ImageModerationService } from '#src/modules/moderation/filters/image-moderation.service';
import { ExternalModerationApiService } from '#src/modules/moderation/filters/external-moderation-api.service';
import moderationConfig from '#src/config/moderation.config';

describe('Moderation filters', () => {
  let keywordFilter: KeywordFilterService;
  let classifier: ContentClassifierService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [moderationConfig],
        }),
      ],
      providers: [KeywordFilterService, ContentClassifierService],
    }).compile();

    keywordFilter = moduleRef.get(KeywordFilterService);
    classifier = moduleRef.get(ContentClassifierService);
  });

  it('keyword filter finds blocklist hits', () => {
    const r = keywordFilter.scan('This is terrorist propaganda');
    expect(r.blocked).toBe(true);
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it('keyword filter passes clean text', () => {
    const r = keywordFilter.scan('Complete the tutorial and earn XP.');
    expect(r.blocked).toBe(false);
    expect(r.hits).toEqual([]);
  });

  it('classifier scores spam higher', () => {
    const r = classifier.classify('click here buy viagra now casino winner');
    expect(r.score).toBeGreaterThan(0.2);
  });
});

/**
 * Service unit tests. Collaborators (keyword filter, classifier, image + external
 * APIs) are mocked so scoring inputs are deterministic and threshold boundaries
 * can be asserted precisely. Thresholds are fixed via a mocked ConfigService:
 * high = 0.85, medium = 0.5, blockOnHighSeverity = true.
 */
describe('ModerationService', () => {
  const HIGH = 0.85;
  const MED = 0.5;

  let service: ModerationService;
  let itemRepo: Record<string, jest.Mock>;
  let appealRepo: Record<string, jest.Mock>;
  let keywordFilter: { scan: jest.Mock };
  let classifier: { classify: jest.Mock };
  let imageModeration: {
    extractUrlsFromProof: jest.Mock;
    moderateUrls: jest.Mock;
  };
  let externalApi: { scoreText: jest.Mock };
  let configValues: Record<string, unknown>;

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: KeywordFilterService, useValue: keywordFilter },
        { provide: ContentClassifierService, useValue: classifier },
        { provide: ImageModerationService, useValue: imageModeration },
        { provide: ExternalModerationApiService, useValue: externalApi },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
        {
          provide: getRepositoryToken(ModerationItem),
          useValue: itemRepo as unknown as Repository<ModerationItem>,
        },
        {
          provide: getRepositoryToken(ModerationAppeal),
          useValue: appealRepo as unknown as Repository<ModerationAppeal>,
        },
      ],
    }).compile();

    return moduleRef.get(ModerationService);
  };

  beforeEach(async () => {
    itemRepo = {
      create: jest.fn((x: Partial<ModerationItem>) => x),
      save: jest.fn(async (x: ModerationItem) => x),
      findOne: jest.fn(),
      findAndCount: jest.fn(async () => [[], 0] as [ModerationItem[], number]),
      count: jest.fn(async () => 0),
    };
    appealRepo = {
      create: jest.fn((x: Partial<ModerationAppeal>) => x),
      save: jest.fn(async (x: ModerationAppeal) => x),
      findOne: jest.fn(),
      findAndCount: jest.fn(
        async () => [[], 0] as [ModerationAppeal[], number],
      ),
      count: jest.fn(async () => 0),
    };

    // Neutral collaborators by default; individual tests override return values.
    keywordFilter = { scan: jest.fn(() => ({ hits: [], blocked: false })) };
    classifier = {
      classify: jest.fn(() => ({ labels: {}, primary: 'SAFE', score: 0 })),
    };
    imageModeration = {
      extractUrlsFromProof: jest.fn(() => []),
      moderateUrls: jest.fn(async () => []),
    };
    externalApi = { scoreText: jest.fn(async () => null) };

    configValues = {
      'moderation.highThreshold': HIGH,
      'moderation.mediumThreshold': MED,
      'moderation.blockOnHighSeverity': true,
    };

    service = await buildService();
  });

  describe('scanText scoring & thresholds', () => {
    it('returns a structured result', async () => {
      const r = await service.scanText('hello world');
      expect(r).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          keywordHits: expect.any(Array),
          labels: expect.any(Object),
          imageFlags: expect.any(Array),
          shouldBlock: expect.any(Boolean),
          shouldManualReview: expect.any(Boolean),
        }),
      );
    });

    it('takes the max score across keyword / classifier / external signals', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: 0.3,
      });
      externalApi.scoreText.mockResolvedValue({ score: 0.7, categories: {} });

      const r = await service.scanText('some text');
      expect(r.score).toBe(0.7);
    });

    it('scores a blocked keyword hit at the maximum (1)', async () => {
      keywordFilter.scan.mockReturnValue({
        hits: ['terrorist'],
        blocked: true,
      });
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SAFE',
        score: 0.1,
      });

      const r = await service.scanText('bad text');
      expect(r.score).toBe(1);
      expect(r.keywordHits).toEqual(['terrorist']);
    });

    it('applies a 0.95 floor when keyword hits are present but not blocking', async () => {
      // hits without `blocked` (e.g. soft-match) still push the score to 0.95
      keywordFilter.scan.mockReturnValue({ hits: ['spammy'], blocked: false });
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SAFE',
        score: 0.1,
      });

      const r = await service.scanText('borderline text');
      expect(r.score).toBe(0.95);
    });

    it('merges classifier and external labels', async () => {
      classifier.classify.mockReturnValue({
        labels: { SPAM: 0.2 },
        primary: 'SPAM',
        score: 0.2,
      });
      externalApi.scoreText.mockResolvedValue({
        score: 0.1,
        categories: { hate: 0.4 },
      });

      const r = await service.scanText('text');
      expect(r.labels).toEqual({ SPAM: 0.2, hate: 0.4 });
    });

    it('does not manual-review or block just below the medium threshold', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SAFE',
        score: MED - 0.01,
      });
      const r = await service.scanText('text');
      expect(r.shouldManualReview).toBe(false);
      expect(r.shouldBlock).toBe(false);
    });

    it('flags for manual review exactly at the medium threshold (boundary)', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: MED,
      });
      const r = await service.scanText('text');
      expect(r.shouldManualReview).toBe(true);
      expect(r.shouldBlock).toBe(false);
    });

    it('still manual-reviews just below the high threshold', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: HIGH - 0.01,
      });
      const r = await service.scanText('text');
      expect(r.shouldManualReview).toBe(true);
      expect(r.shouldBlock).toBe(false);
    });

    it('blocks (and stops manual review) exactly at the high threshold (boundary)', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: HIGH,
      });
      const r = await service.scanText('text');
      expect(r.shouldBlock).toBe(true);
      expect(r.shouldManualReview).toBe(false);
    });

    it('does not block high-severity content when blockOnHighSeverity is false', async () => {
      configValues['moderation.blockOnHighSeverity'] = false;
      service = await buildService();
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: 0.99,
      });

      const r = await service.scanText('text');
      expect(r.shouldBlock).toBe(false);
    });

    it('falls back to default thresholds when config is unset', async () => {
      configValues = {}; // get() returns undefined for everything
      service = await buildService();
      // default high = 0.85 → 0.9 should block
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: 0.9,
      });

      const r = await service.scanText('text');
      expect(r.shouldBlock).toBe(true);
    });

    it('handles empty text without throwing', async () => {
      const r = await service.scanText('');
      expect(r.score).toBe(0);
      expect(r.shouldBlock).toBe(false);
      expect(r.shouldManualReview).toBe(false);
    });
  });

  describe('scanSubmissionContent', () => {
    it('throws MODERATION_BLOCKED when scan says block', async () => {
      classifier.classify.mockReturnValue({
        labels: {},
        primary: 'SPAM',
        score: 0.99,
      });

      await expect(
        service.scanSubmissionContent('sub-1', 'u1', { note: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });

    it('throws when an image is on a blocked host even if text is clean', async () => {
      imageModeration.extractUrlsFromProof.mockReturnValue([
        'http://bad/x.png',
      ]);
      imageModeration.moderateUrls.mockResolvedValue([
        { url: 'http://bad/x.png', reason: 'blocked_host' },
      ]);

      await expect(
        service.scanSubmissionContent('sub-1', 'u1', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('queues for manual review when an image is flagged (non-blocking reason)', async () => {
      imageModeration.extractUrlsFromProof.mockReturnValue(['http://x/x.exe']);
      imageModeration.moderateUrls.mockResolvedValue([
        { url: 'http://x/x.exe', reason: 'suspicious_extension' },
      ]);

      const item = await service.scanSubmissionContent('sub-1', 'u1', {});
      expect(item.status).toBe(ModerationItemStatus.MANUAL_REVIEW);
      expect(item.priority).toBe(8);
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('auto-approves clean submissions', async () => {
      const item = await service.scanSubmissionContent('sub-1', 'u1', {
        note: 'all good',
      });
      expect(item.status).toBe(ModerationItemStatus.AUTO_APPROVED);
      expect(item.priority).toBe(0);
    });
  });

  describe('applyAction — state transitions', () => {
    it('throws NotFound when the item is missing', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.applyAction('missing', ModerationAction.APPROVE, 'admin-1'),
      ).rejects.toThrow('Moderation item not found');
    });

    it('APPROVE moves item to APPROVED and records reviewer', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: '1',
        status: ModerationItemStatus.MANUAL_REVIEW,
      } as ModerationItem);

      const result = await service.applyAction(
        '1',
        ModerationAction.APPROVE,
        'admin-1',
        'looks fine',
      );

      expect(result.status).toBe(ModerationItemStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin-1');
      expect(result.reviewedAt).toBeInstanceOf(Date);
      expect(result.lastAction).toBe(ModerationAction.APPROVE);
      expect(result.notes).toBe('looks fine');
    });

    it('REJECT moves item to REJECTED', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: '1',
        status: ModerationItemStatus.MANUAL_REVIEW,
      } as ModerationItem);

      const result = await service.applyAction(
        '1',
        ModerationAction.REJECT,
        'admin-1',
      );
      expect(result.status).toBe(ModerationItemStatus.REJECTED);
    });

    it('ESCALATE bumps priority (capped at 100) without setting a terminal status', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: '1',
        status: ModerationItemStatus.MANUAL_REVIEW,
        priority: 90,
      } as ModerationItem);

      const result = await service.applyAction(
        '1',
        ModerationAction.ESCALATE,
        'admin-1',
      );
      expect(result.priority).toBe(100);
      expect(result.status).toBe(ModerationItemStatus.MANUAL_REVIEW);
      expect(result.lastAction).toBe(ModerationAction.ESCALATE);
      // ESCALATE should not stamp a review decision
      expect(result.reviewedBy).toBeUndefined();
    });
  });

  describe('createAppeal', () => {
    it('throws NotFound when the item is missing', async () => {
      itemRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createAppeal('u1', 'missing', 'please review'),
      ).rejects.toThrow('Moderation item not found');
    });

    it('rejects appealing another user’s case', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: '1',
        userId: 'u1',
      } as ModerationItem);
      await expect(
        service.createAppeal('u2', '1', 'please review'),
      ).rejects.toThrow('You can only appeal your own moderation cases');
    });

    it('creates a PENDING appeal for the owner', async () => {
      itemRepo.findOne.mockResolvedValue({
        id: '1',
        userId: 'u1',
      } as ModerationItem);

      const appeal = await service.createAppeal('u1', '1', 'please review');
      expect(appealRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          moderationItemId: '1',
          userId: 'u1',
          message: 'please review',
          status: AppealStatus.PENDING,
        }),
      );
      expect(appeal.status).toBe(AppealStatus.PENDING);
    });
  });

  describe('resolveAppeal — state transitions & edge cases', () => {
    it('throws NotFound when the appeal is missing', async () => {
      appealRepo.findOne.mockResolvedValue(null);
      await expect(
        service.resolveAppeal('missing', AppealStatus.APPROVED, 'admin-1'),
      ).rejects.toThrow('Appeal not found');
    });

    it('rejects resolving an already-resolved appeal', async () => {
      appealRepo.findOne.mockResolvedValue({
        id: 'a1',
        status: AppealStatus.REJECTED,
      } as ModerationAppeal);

      await expect(
        service.resolveAppeal('a1', AppealStatus.APPROVED, 'admin-1'),
      ).rejects.toThrow('Appeal already resolved');
      expect(appealRepo.save).not.toHaveBeenCalled();
    });

    it('APPROVED resolution also approves the linked moderation item', async () => {
      const moderationItem = {
        id: 'item-1',
        status: ModerationItemStatus.REJECTED,
      } as ModerationItem;
      appealRepo.findOne.mockResolvedValue({
        id: 'a1',
        status: AppealStatus.PENDING,
        moderationItem,
      } as ModerationAppeal);

      const result = await service.resolveAppeal(
        'a1',
        AppealStatus.APPROVED,
        'admin-1',
        'valid appeal',
      );

      expect(result.status).toBe(AppealStatus.APPROVED);
      expect(result.resolvedBy).toBe('admin-1');
      expect(result.resolvedAt).toBeInstanceOf(Date);
      expect(result.resolutionNote).toBe('valid appeal');
      // linked item flipped to APPROVED and persisted
      expect(moderationItem.status).toBe(ModerationItemStatus.APPROVED);
      expect(moderationItem.lastAction).toBe(ModerationAction.APPROVE);
      expect(itemRepo.save).toHaveBeenCalledWith(moderationItem);
    });

    it('REJECTED resolution leaves the moderation item untouched', async () => {
      const moderationItem = {
        id: 'item-1',
        status: ModerationItemStatus.REJECTED,
      } as ModerationItem;
      appealRepo.findOne.mockResolvedValue({
        id: 'a1',
        status: AppealStatus.PENDING,
        moderationItem,
      } as ModerationAppeal);

      const result = await service.resolveAppeal(
        'a1',
        AppealStatus.REJECTED,
        'admin-1',
      );

      expect(result.status).toBe(AppealStatus.REJECTED);
      expect(result.resolutionNote).toBeNull();
      expect(moderationItem.status).toBe(ModerationItemStatus.REJECTED);
      expect(itemRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('listing & stats', () => {
    it('listPending queries MANUAL_REVIEW items with pagination', async () => {
      itemRepo.findAndCount.mockResolvedValue([
        [{ id: '1' } as ModerationItem],
        1,
      ]);
      const result = await service.listPending(2, 10);
      expect(result).toEqual({
        items: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      });
      expect(itemRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ModerationItemStatus.MANUAL_REVIEW },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('listAppealsPending queries PENDING appeals with the item relation', async () => {
      appealRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.listAppealsPending(1, 20);
      expect(appealRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: AppealStatus.PENDING },
          relations: ['moderationItem'],
          skip: 0,
          take: 20,
        }),
      );
    });

    it('getDashboardStats returns pending review and appeal counts', async () => {
      itemRepo.count.mockResolvedValue(3);
      appealRepo.count.mockResolvedValue(5);
      const stats = await service.getDashboardStats();
      expect(stats).toEqual({ pendingManualReview: 3, pendingAppeals: 5 });
    });
  });
});
