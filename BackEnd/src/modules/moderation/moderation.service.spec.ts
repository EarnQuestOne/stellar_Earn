import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModerationService } from './moderation.service';
import { ModerationItem } from './entities/moderation-item.entity';
import { ModerationAppeal } from './entities/moderation-appeal.entity';
import { KeywordFilterService } from './filters/keyword-filter.service';
import { ContentClassifierService } from './filters/content-classifier.service';
import { ImageModerationService } from './filters/image-moderation.service';
import { ExternalModerationApiService } from './filters/external-moderation-api.service';
import { ModerationConfigCacheService } from './moderation-config-cache.service';

describe('ModerationService', () => {
  let service: ModerationService;

  const mockItemRepo = {
    findAndCount: jest.fn(),
  };
  const mockAppealRepo = {
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockItemRepo.findAndCount.mockResolvedValue([[], 0]);
    mockAppealRepo.findAndCount.mockResolvedValue([[], 0]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: getRepositoryToken(ModerationItem), useValue: mockItemRepo },
        {
          provide: getRepositoryToken(ModerationAppeal),
          useValue: mockAppealRepo,
        },
        { provide: KeywordFilterService, useValue: { scan: jest.fn() } },
        {
          provide: ContentClassifierService,
          useValue: { classify: jest.fn() },
        },
        { provide: ImageModerationService, useValue: {} },
        {
          provide: ExternalModerationApiService,
          useValue: { scoreText: jest.fn() },
        },
        {
          provide: ModerationConfigCacheService,
          useValue: {
            getConfig: jest.fn(() => ({
              blockOnHighSeverity: true,
              highThreshold: 0.85,
              mediumThreshold: 0.5,
              externalApiUrl: '',
              externalApiKey: '',
              imageApiUrl: '',
              imageApiKey: '',
              blockedKeywords: [],
              blockedImageHosts: [],
            })),
          },
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  describe('listPending', () => {
    it('clamps an oversized limit to the maximum allowed page size', async () => {
      await service.listPending(1, 10_000);

      expect(mockItemRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 }),
      );
    });

    it('passes through a limit within the allowed range unchanged', async () => {
      await service.listPending(2, 50);

      expect(mockItemRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 50 }),
      );
    });

    it('falls back to page 1 for a non-positive page value', async () => {
      const result = await service.listPending(-5, 20);

      expect(result.page).toBe(1);
      expect(mockItemRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('falls back to the default limit for a non-positive limit value', async () => {
      const result = await service.listPending(1, 0);

      expect(result.limit).toBe(20);
    });
  });

  describe('listAppealsPending', () => {
    it('clamps an oversized limit to the maximum allowed page size', async () => {
      await service.listAppealsPending(1, 5000);

      expect(mockAppealRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, skip: 0 }),
      );
    });

    it('reflects the clamped values in the returned metadata', async () => {
      const result = await service.listAppealsPending(1, 500);

      expect(result.limit).toBe(100);
    });
  });
});
