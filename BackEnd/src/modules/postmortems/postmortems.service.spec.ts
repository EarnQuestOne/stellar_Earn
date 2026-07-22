import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostmortemService } from './postmortems.service';
import {
  PostmortemEntity,
  IncidentSeverity,
  PostmortemStatus,
} from './postmortems.entity';
import { CreatePostmortemDto, UpdatePostmortemDto } from './dto/postmortem.dto';

describe('PostmortemService', () => {
  let service: PostmortemService;
  let repository: Repository<PostmortemEntity>;

  const mockPostmortemEntity: PostmortemEntity = {
    id: 'test-id-123',
    incidentId: '2024-01-15-1430',
    title: 'Database Connection Pool Exhaustion',
    summary: 'Connection pool was exhausted due to long-running queries',
    incidentDate: new Date('2024-01-15T14:30:00Z'),
    startTime: new Date('2024-01-15T14:30:00Z'),
    endTime: new Date('2024-01-15T14:50:00Z'),
    durationMinutes: 20,
    severity: IncidentSeverity.HIGH,
    servicesAffected: JSON.stringify(['api', 'worker']),
    usersAffected: 150,
    failedTransactions: 500,
    slaBreached: true,
    dataLoss: false,
    rootCause: 'Missing database index on user_sessions table',
    contributingFactors: JSON.stringify(['High load', 'Unoptimized query']),
    technicalExplanation: 'Detailed technical explanation...',
    ttd: 5,
    ttm: 15,
    ttr: 20,
    timelineData: JSON.stringify([]),
    whatWentWell: JSON.stringify(['Team responded quickly']),
    whatWentWrong: JSON.stringify(['No monitoring for this condition']),
    lessonsLearned: JSON.stringify({}),
    actionItems: JSON.stringify([
      {
        id: 'A1',
        action: 'Add database index',
        owner: 'Alice',
        dueDate: '2024-01-20',
        priority: 'P0',
        status: 'not_started',
      },
    ]),
    completedActionItems: 0,
    totalActionItems: 1,
    status: PostmortemStatus.DRAFT,
    incidentCommander: 'john@example.com',
    author: 'alice@example.com',
    facilitator: null,
    attendees: JSON.stringify(['john', 'alice', 'bob']),
    isPublished: false,
    tags: JSON.stringify(['database', 'performance']),
    relatedIncidents: JSON.stringify([]),
    createdAt: new Date('2024-01-15T16:00:00Z'),
    updatedAt: new Date('2024-01-15T16:00:00Z'),
    closedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostmortemService,
        {
          provide: getRepositoryToken(PostmortemEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostmortemService>(PostmortemService);
    repository = module.get<Repository<PostmortemEntity>>(
      getRepositoryToken(PostmortemEntity),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new postmortem', async () => {
      const dto: CreatePostmortemDto = {
        incidentId: '2024-01-15-1430',
        title: 'Test Incident',
        summary: 'Test summary',
        incidentDate: new Date('2024-01-15T14:30:00Z'),
        startTime: new Date('2024-01-15T14:30:00Z'),
        endTime: new Date('2024-01-15T14:50:00Z'),
        severity: IncidentSeverity.HIGH,
        servicesAffected: ['api'],
        usersAffected: 100,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockPostmortemEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockPostmortemEntity);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.incidentId).toBe('2024-01-15-1430');
      expect(result.durationMinutes).toBe(20);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid incident ID', async () => {
      const dto: CreatePostmortemDto = {
        incidentId: 'invalid-id',
        title: 'Test',
        incidentDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        severity: IncidentSeverity.HIGH,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if postmortem already exists', async () => {
      const dto: CreatePostmortemDto = {
        incidentId: '2024-01-15-1430',
        title: 'Test',
        incidentDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        severity: IncidentSeverity.HIGH,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end time is before start time', async () => {
      const dto: CreatePostmortemDto = {
        incidentId: '2024-01-15-1430',
        title: 'Test',
        incidentDate: new Date(),
        startTime: new Date('2024-01-15T14:50:00Z'),
        endTime: new Date('2024-01-15T14:30:00Z'),
        severity: IncidentSeverity.HIGH,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return postmortem by ID', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);

      const result = await service.getById('test-id-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-id-123');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id-123' },
      });
    });

    it('should throw NotFoundException if postmortem not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByIncidentId', () => {
    it('should return postmortem by incident ID', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);

      const result = await service.getByIncidentId('2024-01-15-1430');

      expect(result).toBeDefined();
      expect(result.incidentId).toBe('2024-01-15-1430');
    });

    it('should throw NotFoundException if not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getByIncidentId('nonexistent-incident'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('should list postmortems with default pagination', async () => {
      jest
        .spyOn(repository, 'findAndCount')
        .mockResolvedValue([[mockPostmortemEntity], 1]);

      const result = await service.list({});

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should filter by severity', async () => {
      jest
        .spyOn(repository, 'findAndCount')
        .mockResolvedValue([[mockPostmortemEntity], 1]);

      const result = await service.list({ severity: IncidentSeverity.HIGH });

      expect(result.data).toHaveLength(1);
    });

    it('should filter by status', async () => {
      jest
        .spyOn(repository, 'findAndCount')
        .mockResolvedValue([[mockPostmortemEntity], 1]);

      const result = await service.list({ status: PostmortemStatus.DRAFT });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update postmortem', async () => {
      const updated = { ...mockPostmortemEntity, title: 'Updated Title' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(updated);

      const dto: UpdatePostmortemDto = { title: 'Updated Title' };
      const result = await service.update('test-id-123', dto);

      expect(result.title).toBe('Updated Title');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if postmortem not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent closing postmortem with incomplete action items', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);

      const dto: UpdatePostmortemDto = { status: PostmortemStatus.CLOSED };

      await expect(service.update('test-id-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addActionItem', () => {
    it('should add action item to postmortem', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);
      jest.spyOn(repository, 'save').mockResolvedValue(mockPostmortemEntity);

      const actionItem = {
        action: 'Test action',
        owner: 'Test Owner',
        dueDate: new Date('2024-01-20'),
        priority: 'P1' as const,
      };

      const result = await service.addActionItem('test-id-123', actionItem);

      expect(result).toBeDefined();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return postmortem statistics', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([mockPostmortemEntity]);

      const stats = await service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalPostmortems).toBe(1);
      expect(stats.byStatus).toBeDefined();
      expect(stats.bySeverity).toBeDefined();
      expect(stats.averageTTD).toBeGreaterThanOrEqual(0);
      expect(stats.averageTTM).toBeGreaterThanOrEqual(0);
      expect(stats.averageTTR).toBeGreaterThanOrEqual(0);
    });
  });

  describe('publish', () => {
    it('should publish approved postmortem', async () => {
      const approved = {
        ...mockPostmortemEntity,
        status: PostmortemStatus.APPROVED,
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(approved);
      jest
        .spyOn(repository, 'save')
        .mockResolvedValue({ ...approved, isPublished: true });

      const result = await service.publish('test-id-123');

      expect(result.isPublished).toBe(true);
    });

    it('should throw BadRequestException if not approved', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockPostmortemEntity);

      await expect(service.publish('test-id-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
