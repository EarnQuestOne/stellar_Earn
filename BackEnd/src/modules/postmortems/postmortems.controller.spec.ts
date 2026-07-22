import { Test, TestingModule } from '@nestjs/testing';
import { PostmortemController } from './postmortems.controller';
import { PostmortemService } from './postmortems.service';
import {
  CreatePostmortemDto,
  UpdatePostmortemDto,
  PostmortemResponseDto,
} from './dto/postmortem.dto';
import { IncidentSeverity, PostmortemStatus } from './postmortems.entity';

describe('PostmortemController', () => {
  let controller: PostmortemController;
  let service: PostmortemService;

  const mockPostmortemResponse: PostmortemResponseDto = {
    id: 'test-id-123',
    incidentId: '2024-01-15-1430',
    title: 'Database Connection Pool Exhaustion',
    summary: 'Connection pool exhaustion',
    severity: IncidentSeverity.HIGH,
    status: PostmortemStatus.DRAFT,
    incidentDate: new Date('2024-01-15T14:30:00Z'),
    startTime: new Date('2024-01-15T14:30:00Z'),
    endTime: new Date('2024-01-15T14:50:00Z'),
    durationMinutes: 20,
    usersAffected: 150,
    slaBreached: true,
    rootCause: 'Missing database index',
    whatWentWell: ['Team responded quickly'],
    whatWentWrong: ['No monitoring for this condition'],
    lessonsLearned: {},
    actionItems: [],
    completedActionItems: 0,
    totalActionItems: 1,
    isPublished: false,
    createdAt: new Date('2024-01-15T16:00:00Z'),
    updatedAt: new Date('2024-01-15T16:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostmortemController],
      providers: [
        {
          provide: PostmortemService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            getByIncidentId: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            addActionItem: jest.fn(),
            completeActionItem: jest.fn(),
            getStatistics: jest.fn(),
            findRelatedIncidents: jest.fn(),
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PostmortemController>(PostmortemController);
    service = module.get<PostmortemService>(PostmortemService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new postmortem', async () => {
      const dto: CreatePostmortemDto = {
        incidentId: '2024-01-15-1430',
        title: 'Test Incident',
        incidentDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        severity: IncidentSeverity.HIGH,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockPostmortemResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockPostmortemResponse);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('getById', () => {
    it('should return postmortem by ID', async () => {
      jest.spyOn(service, 'getById').mockResolvedValue(mockPostmortemResponse);

      const result = await controller.getById('test-id-123');

      expect(result).toEqual(mockPostmortemResponse);
      expect(service.getById).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('getByIncidentId', () => {
    it('should return postmortem by incident ID', async () => {
      jest
        .spyOn(service, 'getByIncidentId')
        .mockResolvedValue(mockPostmortemResponse);

      const result = await controller.getByIncidentId('2024-01-15-1430');

      expect(result).toEqual(mockPostmortemResponse);
      expect(service.getByIncidentId).toHaveBeenCalledWith('2024-01-15-1430');
    });
  });

  describe('list', () => {
    it('should return paginated list of postmortems', async () => {
      const mockList = {
        data: [mockPostmortemResponse],
        total: 1,
        limit: 20,
        offset: 0,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockList);

      const result = await controller.list({});

      expect(result).toEqual(mockList);
      expect(result.data).toHaveLength(1);
    });

    it('should filter postmortems by severity', async () => {
      const mockList = {
        data: [mockPostmortemResponse],
        total: 1,
        limit: 20,
        offset: 0,
      };

      jest.spyOn(service, 'list').mockResolvedValue(mockList);

      const result = await controller.list({ severity: IncidentSeverity.HIGH });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update postmortem', async () => {
      const dto: UpdatePostmortemDto = { title: 'Updated Title' };
      const updated = { ...mockPostmortemResponse, title: 'Updated Title' };

      jest.spyOn(service, 'update').mockResolvedValue(updated);

      const result = await controller.update('test-id-123', dto);

      expect(result.title).toBe('Updated Title');
      expect(service.update).toHaveBeenCalledWith('test-id-123', dto);
    });
  });

  describe('addActionItem', () => {
    it('should add action item to postmortem', async () => {
      const actionItem = {
        action: 'Test action',
        owner: 'Test Owner',
        dueDate: new Date('2024-01-20'),
        priority: 'P1' as const,
      };

      jest
        .spyOn(service, 'addActionItem')
        .mockResolvedValue(mockPostmortemResponse);

      const result = await controller.addActionItem('test-id-123', actionItem);

      expect(result).toEqual(mockPostmortemResponse);
      expect(service.addActionItem).toHaveBeenCalledWith(
        'test-id-123',
        actionItem,
      );
    });
  });

  describe('completeActionItem', () => {
    it('should mark action item as complete', async () => {
      jest
        .spyOn(service, 'completeActionItem')
        .mockResolvedValue(mockPostmortemResponse);

      const result = await controller.completeActionItem('test-id-123', 'A1');

      expect(result).toEqual(mockPostmortemResponse);
      expect(service.completeActionItem).toHaveBeenCalledWith(
        'test-id-123',
        'A1',
      );
    });
  });

  describe('getStatistics', () => {
    it('should return postmortem statistics', async () => {
      const mockStats = {
        totalPostmortems: 10,
        byStatus: { draft: 3, approved: 7 },
        bySeverity: { high: 5, medium: 5 },
        averageTTD: 10,
        averageTTM: 20,
        averageTTR: 30,
        actionItemCompletionRate: 80,
        mostCommonRootCauses: [],
        recentIncidents: [],
      };

      jest.spyOn(service, 'getStatistics').mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(result).toEqual(mockStats);
      expect(result.totalPostmortems).toBe(10);
    });
  });

  describe('findRelated', () => {
    it('should return related incidents', async () => {
      const mockRelated = [mockPostmortemResponse];

      jest
        .spyOn(service, 'findRelatedIncidents')
        .mockResolvedValue(mockRelated);

      const result = await controller.findRelated('test-id-123');

      expect(result).toEqual(mockRelated);
      expect(service.findRelatedIncidents).toHaveBeenCalledWith('test-id-123');
    });
  });

  describe('publish', () => {
    it('should publish postmortem', async () => {
      const published = { ...mockPostmortemResponse, isPublished: true };

      jest.spyOn(service, 'publish').mockResolvedValue(published);

      const result = await controller.publish('test-id-123');

      expect(result.isPublished).toBe(true);
      expect(service.publish).toHaveBeenCalledWith('test-id-123');
    });
  });
});
