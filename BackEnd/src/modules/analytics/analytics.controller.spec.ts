import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { PlatformAnalyticsService } from './services/platform-analytics.service';
import { QuestAnalyticsService } from './services/quest-analytics.service';
import { UserAnalyticsService } from './services/user-analytics.service';
import { StreamExportService } from './services/stream-export.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Quest } from './entities/quest.entity';
import { User } from '../users/entities/user.entity';
import { Submission } from './entities/submission.entity';
import { Response } from 'express';
import { ExportFormat } from './dto/export-query.dto';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let streamExportService: StreamExportService;
  let questRepositoryMock: any;
  let userRepositoryMock: any;
  let submissionRepositoryMock: any;

  const mockRepository = () => ({
    createQueryBuilder: jest.fn().mockReturnValue({
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: PlatformAnalyticsService,
          useValue: {},
        },
        {
          provide: QuestAnalyticsService,
          useValue: {},
        },
        {
          provide: UserAnalyticsService,
          useValue: {},
        },
        StreamExportService,
        {
          provide: getRepositoryToken(Quest),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(Submission),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    streamExportService = module.get<StreamExportService>(StreamExportService);
    questRepositoryMock = module.get(getRepositoryToken(Quest));
    userRepositoryMock = module.get(getRepositoryToken(User));
    submissionRepositoryMock = module.get(getRepositoryToken(Submission));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('exportQuests', () => {
    it('should query quest repository and stream CSV data', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockQuests = [
        {
          id: '1',
          contractQuestId: 'quest-1',
          title: 'Quest 1',
          rewardAsset: 'XLM',
          rewardAmount: '100',
          status: 'Active',
          createdAt: new Date(),
        },
      ];

      const andWhereMock = jest.fn().mockReturnThis();
      const orderByMock = jest.fn().mockReturnThis();
      const getManyMock = jest
        .fn()
        .mockResolvedValueOnce(mockQuests)
        .mockResolvedValueOnce([]);

      questRepositoryMock.createQueryBuilder.mockReturnValue({
        andWhere: andWhereMock,
        orderBy: orderByMock,
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: getManyMock,
      });

      jest
        .spyOn(streamExportService, 'streamAsCSV')
        .mockResolvedValue(undefined);

      await controller.exportQuests(
        {
          format: ExportFormat.CSV,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        },
        mockResponse,
      );

      expect(questRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
        'quest',
      );
      expect(andWhereMock).toHaveBeenCalledTimes(2); // startDate and endDate
      expect(orderByMock).toHaveBeenCalledWith('quest.createdAt', 'DESC');
      expect(streamExportService.streamAsCSV).toHaveBeenCalled();
    });
  });

  describe('exportUsers', () => {
    it('should query user repository and stream JSON data', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockUsers = [
        {
          id: '1',
          stellarAddress: 'GABC123',
          username: 'user1',
          role: 'user',
          createdAt: new Date(),
        },
      ];

      const getManyMock = jest
        .fn()
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce([]);

      userRepositoryMock.createQueryBuilder.mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: getManyMock,
      });

      jest
        .spyOn(streamExportService, 'streamAsJSON')
        .mockResolvedValue(undefined);

      await controller.exportUsers({ format: ExportFormat.JSON }, mockResponse);

      expect(userRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );
      expect(streamExportService.streamAsJSON).toHaveBeenCalled();
    });
  });

  describe('exportSubmissions', () => {
    it('should query submission repository and stream JSONL data', async () => {
      const mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      const mockSubmissions = [
        {
          id: '1',
          contractSubmissionId: 'sub-1',
          quest: { id: 'quest-1' },
          user: { id: 'user-1' },
          proofHash: 'hash1',
          status: 'Pending',
          submittedAt: new Date(),
        },
      ];

      const leftJoinAndSelectMock = jest.fn().mockReturnThis();
      const getManyMock = jest
        .fn()
        .mockResolvedValueOnce(mockSubmissions)
        .mockResolvedValueOnce([]);

      submissionRepositoryMock.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: leftJoinAndSelectMock,
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: getManyMock,
      });

      jest
        .spyOn(streamExportService, 'streamAsJSONLines')
        .mockResolvedValue(undefined);

      await controller.exportSubmissions(
        { format: ExportFormat.JSONL },
        mockResponse,
      );

      expect(submissionRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
        'submission',
      );
      expect(leftJoinAndSelectMock).toHaveBeenCalledWith(
        'submission.quest',
        'quest',
      );
      expect(leftJoinAndSelectMock).toHaveBeenCalledWith(
        'submission.user',
        'user',
      );
      expect(streamExportService.streamAsJSONLines).toHaveBeenCalled();
    });
  });
});
