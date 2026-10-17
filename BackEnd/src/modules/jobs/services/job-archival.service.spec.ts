import { Test, TestingModule } from '@nestjs/testing';
import { JobArchivalService } from './job-archival.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JobLog } from '../entities/job-log.entity';
import { JobLogArchive } from '../entities/job-log-archive.entity';

const mockJobLogRepo = {
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue({ affected: 0 }),
  findOne: jest.fn().mockResolvedValue(null),
};

const mockArchiveRepo = {
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  delete: jest.fn().mockResolvedValue({ affected: 0 }),
  findOne: jest.fn().mockResolvedValue(null),
  createQueryBuilder: jest.fn(() => ({
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  })),
};

describe('JobArchivalService', () => {
  let service: JobArchivalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobArchivalService,
        { provide: getRepositoryToken(JobLog), useValue: mockJobLogRepo },
        {
          provide: getRepositoryToken(JobLogArchive),
          useValue: mockArchiveRepo,
        },
      ],
    }).compile();

    service = module.get<JobArchivalService>(JobArchivalService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('archiveOldJobs', () => {
    it('should archive 0 jobs when no eligible jobs exist', async () => {
      const result = await service.archiveOldJobs();
      expect(result.archived).toBe(0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('purgeOldArchives', () => {
    it('should purge 0 archives when no old archives exist', async () => {
      const result = await service.purgeOldArchives();
      expect(result.purged).toBe(0);
    });
  });

  describe('runMaintenance', () => {
    it('should run both archive and purge', async () => {
      const result = await service.runMaintenance();
      expect(result.archived).toBe(0);
      expect(result.purged).toBe(0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetrics', () => {
    it('should return zero counts when tables are empty', async () => {
      const metrics = await service.getMetrics();
      expect(metrics.activeCount).toBe(0);
      expect(metrics.archivedCount).toBe(0);
      expect(metrics.oldestActiveAge).toBeNull();
      expect(metrics.oldestArchivedAge).toBeNull();
    });
  });
});
