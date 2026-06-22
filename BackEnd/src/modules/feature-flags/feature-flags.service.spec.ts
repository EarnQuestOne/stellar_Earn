import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeatureFlagsService } from './feature-flags.service';
import {
  FeatureFlag,
  RolloutStrategy,
  FlagStatus,
} from './entities/feature-flag.entity';
import {
  FeatureFlagAuditLog,
  AuditAction,
} from './entities/feature-flag-audit.entity';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let _featureFlagRepository: Repository<FeatureFlag>;
  let _auditLogRepository: Repository<FeatureFlagAuditLog>;
  let _cacheManager: any;

  const mockFeatureFlagRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
  };

  const mockAuditLogRepository = {
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        {
          provide: getRepositoryToken(FeatureFlag),
          useValue: mockFeatureFlagRepository,
        },
        {
          provide: getRepositoryToken(FeatureFlagAuditLog),
          useValue: mockAuditLogRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagsService>(FeatureFlagsService);
    _featureFlagRepository = module.get<Repository<FeatureFlag>>(
      getRepositoryToken(FeatureFlag),
    );
    _auditLogRepository = module.get<Repository<FeatureFlagAuditLog>>(
      getRepositoryToken(FeatureFlagAuditLog),
    );
    _cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return false when flag does not exist', async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('NON_EXISTENT_FLAG');

      expect(result).toBe(false);
      expect(mockFeatureFlagRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'NON_EXISTENT_FLAG' },
      });
    });

    it('should return false when flag is disabled', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: false,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('TEST_FLAG');

      expect(result).toBe(false);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return true for BOOLEAN strategy when enabled', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('TEST_FLAG');

      expect(result).toBe(true);
    });

    it('should evaluate percentage rollout correctly', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.PERCENTAGE,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 50,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('TEST_FLAG', 'user123');

      expect(result).toBeDefined();
      expect(typeof result).toBe('boolean');
    });

    it('should return true for whitelisted user', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.USER_WHITELIST,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: ['user123', 'user456'],
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('TEST_FLAG', 'user123');

      expect(result).toBe(true);
    });

    it('should return false for blacklisted user', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.USER_BLACKLIST,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: ['user123'],
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.isEnabled('TEST_FLAG', 'user123');

      expect(result).toBe(false);
    });

    it('should evaluate segment rules correctly', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.SEGMENT_BASED,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: {
          role: ['ADMIN'],
          level: { min: 5 },
        },
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockCacheManager.get.mockResolvedValue(undefined);

      const userContext = { role: 'ADMIN', level: 10, xp: 1000 };
      const result = await service.isEnabled(
        'TEST_FLAG',
        'user123',
        userContext,
      );

      expect(result).toBe(true);
    });

    it('should use cached value when available', async () => {
      mockCacheManager.get.mockResolvedValue(true);

      const result = await service.isEnabled('TEST_FLAG', 'user123');

      expect(result).toBe(true);
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockFeatureFlagRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new feature flag', async () => {
      const createDto: CreateFeatureFlagDto = {
        key: 'NEW_FLAG',
        name: 'New Flag',
        description: 'New flag description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        enabled: true,
      };

      const savedFlag: FeatureFlag = {
        id: '1',
        ...createDto,
        status: FlagStatus.DRAFT,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: 'user123',
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(null);
      mockFeatureFlagRepository.create.mockReturnValue(savedFlag);
      mockFeatureFlagRepository.save.mockResolvedValue(savedFlag);
      mockAuditLogRepository.save.mockResolvedValue({});

      const result = await service.create(createDto, 'user123');

      expect(result).toEqual(savedFlag);
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREATED,
          performedBy: 'user123',
        }),
      );
    });

    it('should throw error when flag with same key exists', async () => {
      const createDto: CreateFeatureFlagDto = {
        key: 'EXISTING_FLAG',
        name: 'Existing Flag',
        description: 'Existing flag description',
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue({
        id: '1',
        key: 'EXISTING_FLAG',
      });

      await expect(service.create(createDto, 'user123')).rejects.toThrow(
        'Feature flag with key "EXISTING_FLAG" already exists',
      );
    });
  });

  describe('update', () => {
    it('should update an existing feature flag', async () => {
      const existingFlag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: false,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: 'user123',
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto: UpdateFeatureFlagDto = {
        enabled: true,
      };

      const updatedFlag: FeatureFlag = {
        ...existingFlag,
        enabled: true,
        updatedBy: 'user456',
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(existingFlag);
      mockFeatureFlagRepository.save.mockResolvedValue(updatedFlag);
      mockAuditLogRepository.save.mockResolvedValue({});

      const result = await service.update('1', updateDto, 'user456');

      expect(result.enabled).toBe(true);
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ACTIVATED,
        }),
      );
    });

    it('should throw error when flag not found', async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);

      await expect(service.update('1', {}, 'user123')).rejects.toThrow(
        'Feature flag with ID "1" not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete a feature flag', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: 'user123',
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);
      mockFeatureFlagRepository.remove.mockResolvedValue(flag);
      mockAuditLogRepository.save.mockResolvedValue({});

      await service.delete('1', 'user123');

      expect(mockFeatureFlagRepository.remove).toHaveBeenCalledWith(flag);
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETED,
        }),
      );
    });

    it('should throw error when flag not found', async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);

      await expect(service.delete('1', 'user123')).rejects.toThrow(
        'Feature flag with ID "1" not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return all feature flags', async () => {
      const flags: FeatureFlag[] = [
        {
          id: '1',
          key: 'FLAG1',
          name: 'Flag 1',
          description: 'Description 1',
          rolloutStrategy: RolloutStrategy.BOOLEAN,
          status: FlagStatus.ACTIVE,
          enabled: true,
          rolloutPercentage: 0,
          whitelistedUsers: null,
          blacklistedUsers: null,
          segmentRules: null,
          metadata: null,
          createdBy: null,
          updatedBy: null,
          scheduledActivationAt: null,
          scheduledDeactivationAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFeatureFlagRepository.find.mockResolvedValue(flags);

      const result = await service.findAll();

      expect(result).toEqual(flags);
      expect(mockFeatureFlagRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a specific feature flag', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);

      const result = await service.findOne('1');

      expect(result).toEqual(flag);
    });

    it('should throw error when flag not found', async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(
        'Feature flag with ID "1" not found',
      );
    });
  });

  describe('findByKey', () => {
    it('should return a feature flag by key', async () => {
      const flag: FeatureFlag = {
        id: '1',
        key: 'TEST_FLAG',
        name: 'Test Flag',
        description: 'Test description',
        rolloutStrategy: RolloutStrategy.BOOLEAN,
        status: FlagStatus.ACTIVE,
        enabled: true,
        rolloutPercentage: 0,
        whitelistedUsers: null,
        blacklistedUsers: null,
        segmentRules: null,
        metadata: null,
        createdBy: null,
        updatedBy: null,
        scheduledActivationAt: null,
        scheduledDeactivationAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFeatureFlagRepository.findOne.mockResolvedValue(flag);

      const result = await service.findByKey('TEST_FLAG');

      expect(result).toEqual(flag);
      expect(mockFeatureFlagRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'TEST_FLAG' },
      });
    });

    it('should throw error when flag not found', async () => {
      mockFeatureFlagRepository.findOne.mockResolvedValue(null);

      await expect(service.findByKey('TEST_FLAG')).rejects.toThrow(
        'Feature flag with key "TEST_FLAG" not found',
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs for a flag', async () => {
      const logs: FeatureFlagAuditLog[] = [
        {
          id: '1',
          flagId: '1',
          flagKey: 'TEST_FLAG',
          action: AuditAction.CREATED,
          previousValue: null,
          newValue: {},
          performedBy: 'user123',
          reason: 'Initial creation',
          ipAddress: '127.0.0.1',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockAuditLogRepository.find.mockResolvedValue(logs);

      const result = await service.getAuditLogs('1');

      expect(result).toEqual(logs);
      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { flagId: '1' },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
