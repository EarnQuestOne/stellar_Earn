import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModerationService } from '../../src/modules/moderation/moderation.service';
import {
  ModerationItem,
  ModerationAction,
} from '../../src/modules/moderation/entities/moderation-item.entity';
import { ModerationAppeal } from '../../src/modules/moderation/entities/moderation-appeal.entity';
import { KeywordFilterService } from '../../src/modules/moderation/filters/keyword-filter.service';
import { ContentClassifierService } from '../../src/modules/moderation/filters/content-classifier.service';
import { ImageModerationService } from '../../src/modules/moderation/filters/image-moderation.service';
import { ExternalModerationApiService } from '../../src/modules/moderation/filters/external-moderation-api.service';
import moderationConfig from '../../src/config/moderation.config';

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

describe('ModerationService', () => {
  let service: ModerationService;
  let itemRepo: Record<string, jest.Mock>;
  let appealRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    itemRepo = {
      create: jest.fn((x: ModerationItem) => x),
      save: jest.fn(async (x: ModerationItem) => x),
      findOne: jest.fn(),
      findAndCount: jest.fn(async () => [[], 0] as [ModerationItem[], number]),
      count: jest.fn(async () => 0),
    };
    appealRepo = {
      create: jest.fn((x: ModerationAppeal) => x),
      save: jest.fn(async (x: ModerationAppeal) => x),
      findOne: jest.fn(),
      findAndCount: jest.fn(async () => [[], 0] as [ModerationAppeal[], number]),
      count: jest.fn(async () => 0),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [moderationConfig],
        }),
      ],
      providers: [
        ModerationService,
        KeywordFilterService,
        ContentClassifierService,
        ImageModerationService,
        ExternalModerationApiService,
        { provide: getRepositoryToken(ModerationItem), useValue: itemRepo as unknown as Repository<ModerationItem> },
        {
          provide: getRepositoryToken(ModerationAppeal),
          useValue: appealRepo as unknown as Repository<ModerationAppeal>,
        },
      ],
    }).compile();

    service = moduleRef.get(ModerationService);
  });

  it('scanText returns structured result', async () => {
    const r = await service.scanText('hello world');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('keywordHits');
    expect(r).toHaveProperty('shouldBlock');
  });

  it('applyAction updates item when found', async () => {
    itemRepo.findOne.mockResolvedValue({
      id: '1',
      status: 'MANUAL_REVIEW',
    } as ModerationItem);
    await service.applyAction('1', ModerationAction.APPROVE, 'admin-1', 'ok');
    expect(itemRepo.save).toHaveBeenCalled();
  });

  it('createAppeal rejects wrong user', async () => {
    itemRepo.findOne.mockResolvedValue({
      id: '1',
      userId: 'u1',
    } as ModerationItem);
    await expect(
      service.createAppeal('u2', '1', 'please review'),
    ).rejects.toThrow();
  });
});
