import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudRiskRulesService } from './fraud-risk-rules.service';
import { Payout } from '../entities/payout.entity';

describe('FraudRiskRulesService', () => {
  let service: FraudRiskRulesService;
  let _repository: Repository<Payout>;

  const mockPayoutRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudRiskRulesService,
        {
          provide: getRepositoryToken(Payout),
          useValue: mockPayoutRepository,
        },
      ],
    }).compile();

    service = module.get<FraudRiskRulesService>(FraudRiskRulesService);
    _repository = module.get<Repository<Payout>>(getRepositoryToken(Payout));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzePayout', () => {
    it('should analyze a payout and return risk assessment', async () => {
      const mockPayout = {
        id: 'test-id',
        stellarAddress: 'test-address',
        amount: 100,
        asset: 'XLM',
        retryCount: 0,
      };

      mockPayoutRepository.findOne.mockResolvedValue(mockPayout);
      mockPayoutRepository.find.mockResolvedValue([mockPayout]);

      const result = await service.analyzePayout('test-id');

      expect(result).toHaveProperty('payoutId', 'test-id');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('flagged');
      expect(result).toHaveProperty('timestamp');
    });

    it('should flag high amount payouts as high risk', async () => {
      const mockPayout = {
        id: 'test-id',
        stellarAddress: 'test-address',
        amount: 15000,
        asset: 'XLM',
        retryCount: 0,
      };

      mockPayoutRepository.findOne.mockResolvedValue(mockPayout);
      mockPayoutRepository.find.mockResolvedValue([mockPayout]);

      const result = await service.analyzePayout('test-id');

      expect(result.riskFactors).toContain('Unusually high payout amount');
      expect(result.riskLevel).toBe('high');
    });

    it('should flag multiple payouts to same address', async () => {
      const mockPayout = {
        id: 'test-id',
        stellarAddress: 'test-address',
        amount: 100,
        asset: 'XLM',
        retryCount: 0,
      };

      const recentPayouts = Array(6).fill(mockPayout);

      mockPayoutRepository.findOne.mockResolvedValue(mockPayout);
      mockPayoutRepository.find.mockResolvedValue(recentPayouts);

      const result = await service.analyzePayout('test-id');

      expect(result.riskFactors).toContain(
        'Multiple payouts to same address in 24 hours',
      );
    });

    it('should throw error if payout not found', async () => {
      mockPayoutRepository.findOne.mockResolvedValue(null);

      await expect(service.analyzePayout('non-existent-id')).rejects.toThrow(
        'Payout non-existent-id not found',
      );
    });
  });

  describe('analyzeRecentPayouts', () => {
    it('should batch analyze recent payouts', async () => {
      const mockPayouts = [
        { id: 'id1', stellarAddress: 'addr1', amount: 100, retryCount: 0 },
        { id: 'id2', stellarAddress: 'addr2', amount: 200, retryCount: 0 },
      ];

      mockPayoutRepository.find.mockResolvedValue(mockPayouts);
      mockPayoutRepository.findOne.mockImplementation((id) =>
        Promise.resolve(mockPayouts.find((p: any) => p.id === id)),
      );

      const result = await service.analyzeRecentPayouts(24);

      expect(result).toHaveProperty('totalPayoutsChecked', 2);
      expect(result).toHaveProperty('flaggedPayouts');
      expect(result).toHaveProperty('assessments');
      expect(result.assessments).toHaveLength(2);
    });
  });

  describe('shouldBlockPayout', () => {
    it('should return true for critical risk payouts', async () => {
      const mockPayout = {
        id: 'test-id',
        stellarAddress: 'test-address',
        amount: 60000,
        asset: 'XLM',
        retryCount: 0,
      };

      mockPayoutRepository.findOne.mockResolvedValue(mockPayout);
      mockPayoutRepository.find.mockResolvedValue([mockPayout]);

      const result = await service.shouldBlockPayout('test-id');

      expect(result).toBe(true);
    });

    it('should return false for low risk payouts', async () => {
      const mockPayout = {
        id: 'test-id',
        stellarAddress: 'test-address',
        amount: 100,
        asset: 'XLM',
        retryCount: 0,
      };

      mockPayoutRepository.findOne.mockResolvedValue(mockPayout);
      mockPayoutRepository.find.mockResolvedValue([mockPayout]);

      const result = await service.shouldBlockPayout('test-id');

      expect(result).toBe(false);
    });
  });

  describe('getRiskStatistics', () => {
    it('should return risk statistics', async () => {
      mockPayoutRepository.count.mockResolvedValue(100);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValueOnce({ avg: '500' })
          .mockResolvedValueOnce({ count: '50' }),
      };

      mockPayoutRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getRiskStatistics();

      expect(result).toHaveProperty('totalPayouts', 100);
      expect(result).toHaveProperty('highRiskPayouts');
      expect(result).toHaveProperty('criticalRiskPayouts');
      expect(result).toHaveProperty('averagePayoutAmount');
      expect(result).toHaveProperty('uniqueAddresses');
    });
  });
});
