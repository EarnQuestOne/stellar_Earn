import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import {
  ReferralReward,
  ReferralRewardStatus,
} from './entities/referral-reward.entity';
import { User } from '../users/entities/user.entity';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let referralsRepository: any;
  let referralRewardsRepository: any;
  let usersRepository: any;
  let configService: any;
  let usersService: any;
  let jobsService: any;
  let eventEmitter: any;

  const mockUserA: User = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    username: 'userA',
    stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  } as any;

  const mockUserB: User = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    username: 'userB',
    stellarAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
  } as any;

  const mockUserC: User = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    username: 'userC',
    stellarAddress: 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
  } as any;

  beforeEach(() => {
    referralsRepository = {
      create: jest.fn((dto) => ({ ...dto, id: 'mock-referral-id' })),
      save: jest.fn((entity) =>
        Promise.resolve({
          ...entity,
          id: entity.id || 'mock-referral-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    referralRewardsRepository = {
      create: jest.fn((dto) => ({ ...dto, id: 'mock-reward-id' })),
      save: jest.fn((entity) =>
        Promise.resolve({
          ...entity,
          id: entity.id || 'mock-reward-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    usersRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      })),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_URL') return 'https://stellarearn.com';
        return undefined;
      }),
    };

    usersService = {
      applyReputationDeltaAtomic: jest.fn().mockResolvedValue({}),
    };

    jobsService = {
      addJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    service = new ReferralsService(
      referralsRepository,
      referralRewardsRepository,
      usersRepository,
      configService,
      usersService,
      jobsService,
      eventEmitter,
    );
  });

  describe('generateReferralCode & getReferralCode', () => {
    it('generates a stable, unique referral code from user ID', () => {
      const codeA = service.generateReferralCode(mockUserA.id);
      expect(codeA).toBe('REF-AAAAAAAA');

      const codeB = service.generateReferralCode(mockUserB.id);
      expect(codeB).toBe('REF-BBBBBBBB');

      const response = service.getReferralCode(mockUserA);
      expect(response.code).toBe('REF-AAAAAAAA');
      expect(response.referralLink).toBe(
        'https://stellarearn.com/signup?ref=REF-AAAAAAAA',
      );
      expect(response.referrerId).toBe(mockUserA.id);
    });
  });

  describe('resolveCode', () => {
    it('resolves a referral code by user ID prefix', async () => {
      usersRepository.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserA),
      }));

      const resolved = await service.resolveCode('REF-AAAAAAAA');
      expect(resolved).toEqual(mockUserA);
    });

    it('resolves by username if prefix query is empty', async () => {
      usersRepository.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }));
      usersRepository.findOne = jest.fn().mockResolvedValue(mockUserB);

      const resolved = await service.resolveCode('userB');
      expect(resolved).toEqual(mockUserB);
    });

    it('returns null for unknown referral code', async () => {
      usersRepository.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }));
      usersRepository.findOne = jest.fn().mockResolvedValue(null);

      const resolved = await service.resolveCode('REF-UNKNOWN');
      expect(resolved).toBeNull();
    });
  });

  describe('isCircularAttribution', () => {
    it('detects self-loop (A -> A)', async () => {
      const isCircular = await service.isCircularAttribution(
        mockUserA.id,
        mockUserA.id,
      );
      expect(isCircular).toBe(true);
    });

    it('detects direct 2-node circular attribution (A -> B -> A)', async () => {
      // User B was referred by User A
      referralsRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.referredUserId === mockUserB.id) {
          return Promise.resolve({
            id: 'ref-1',
            referrerId: mockUserA.id,
            referredUserId: mockUserB.id,
          });
        }
        return Promise.resolve(null);
      });

      // Now User B tries to refer User A
      const isCircular = await service.isCircularAttribution(
        mockUserB.id,
        mockUserA.id,
      );
      expect(isCircular).toBe(true);
    });

    it('detects transitive 3-node circular attribution (A -> B -> C -> A)', async () => {
      // User B was referred by A; User C was referred by B
      referralsRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.referredUserId === mockUserC.id) {
          return Promise.resolve({
            id: 'ref-bc',
            referrerId: mockUserB.id,
            referredUserId: mockUserC.id,
          });
        }
        if (where.referredUserId === mockUserB.id) {
          return Promise.resolve({
            id: 'ref-ab',
            referrerId: mockUserA.id,
            referredUserId: mockUserB.id,
          });
        }
        return Promise.resolve(null);
      });

      // User C tries to refer User A
      const isCircular = await service.isCircularAttribution(
        mockUserC.id,
        mockUserA.id,
      );
      expect(isCircular).toBe(true);
    });

    it('allows valid acyclic referral chain (A -> B, B -> C, C -> D)', async () => {
      referralsRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.referredUserId === mockUserC.id) {
          return Promise.resolve({
            id: 'ref-bc',
            referrerId: mockUserB.id,
            referredUserId: mockUserC.id,
          });
        }
        if (where.referredUserId === mockUserB.id) {
          return Promise.resolve({
            id: 'ref-ab',
            referrerId: mockUserA.id,
            referredUserId: mockUserB.id,
          });
        }
        return Promise.resolve(null);
      });

      // User C referring a new User D
      const isCircular = await service.isCircularAttribution(
        mockUserC.id,
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
      );
      expect(isCircular).toBe(false);
    });
  });

  describe('recordAttribution', () => {
    it('successfully records pending attribution for a new referred user', async () => {
      jest.spyOn(service, 'resolveCode').mockResolvedValue(mockUserA);
      referralsRepository.findOne.mockResolvedValue(null);

      const referral = await service.recordAttribution(
        mockUserB.id,
        'REF-AAAAAAAA',
      );

      expect(referral.referrerId).toBe(mockUserA.id);
      expect(referral.referredUserId).toBe(mockUserB.id);
      expect(referral.status).toBe(ReferralStatus.PENDING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'referral.created',
        expect.objectContaining({
          referrerId: mockUserA.id,
          referredUserId: mockUserB.id,
        }),
      );
    });

    it('rejects empty referral code', async () => {
      await expect(service.recordAttribution(mockUserB.id, '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid/unrecognized referral code', async () => {
      jest.spyOn(service, 'resolveCode').mockResolvedValue(null);
      referralsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordAttribution(mockUserB.id, 'REF-INVALID'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects self-referral (referring yourself)', async () => {
      jest.spyOn(service, 'resolveCode').mockResolvedValue(mockUserA);
      referralsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordAttribution(mockUserA.id, 'REF-AAAAAAAA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate attribution when user was already referred', async () => {
      referralsRepository.findOne.mockResolvedValue({
        id: 'existing-ref',
        referredUserId: mockUserB.id,
      });

      await expect(
        service.recordAttribution(mockUserB.id, 'REF-AAAAAAAA'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects circular attribution', async () => {
      jest.spyOn(service, 'resolveCode').mockResolvedValue(mockUserB);
      referralsRepository.findOne.mockResolvedValueOnce(null); // not referred yet as User A
      jest.spyOn(service, 'isCircularAttribution').mockResolvedValue(true);

      await expect(
        service.recordAttribution(mockUserA.id, 'REF-BBBBBBBB'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleQualifyingSubmission', () => {
    it('qualifies a pending referral and enqueues reward processing job', async () => {
      const pendingReferral: Referral = {
        id: 'ref-100',
        referrerId: mockUserA.id,
        referredUserId: mockUserB.id,
        code: 'REF-AAAAAAAA',
        status: ReferralStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      referralsRepository.findOne.mockResolvedValue(pendingReferral);

      const result = await service.handleQualifyingSubmission(
        mockUserB.id,
        'submission-999',
      );

      expect(result).toBeDefined();
      expect(result?.status).toBe(ReferralStatus.QUALIFIED);
      expect(result?.qualifiedAt).toBeInstanceOf(Date);
      expect(jobsService.addJob).toHaveBeenCalledWith(
        'referrals',
        expect.objectContaining({
          referralId: 'ref-100',
          referrerId: mockUserA.id,
          referredUserId: mockUserB.id,
        }),
        {},
        'referral:reward',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'referral.qualified',
        expect.objectContaining({
          referralId: 'ref-100',
          submissionId: 'submission-999',
        }),
      );
    });

    it('returns null if the user was not referred or already qualified', async () => {
      referralsRepository.findOne.mockResolvedValue(null);

      const result = await service.handleQualifyingSubmission(
        mockUserC.id,
        'sub-1',
      );
      expect(result).toBeNull();
      expect(jobsService.addJob).not.toHaveBeenCalled();
    });
  });

  describe('creditReward', () => {
    it('idempotently credits referral reward to referrer and updates status to REWARDED', async () => {
      const qualifiedReferral: Referral = {
        id: 'ref-200',
        referrerId: mockUserA.id,
        referredUserId: mockUserB.id,
        code: 'REF-AAAAAAAA',
        status: ReferralStatus.QUALIFIED,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      referralsRepository.findOne.mockResolvedValue(qualifiedReferral);
      referralRewardsRepository.findOne.mockResolvedValue(null); // not credited yet

      const reward = await service.creditReward('ref-200', 50, 'XLM');

      expect(reward).toBeDefined();
      expect(reward.status).toBe(ReferralRewardStatus.CREDITED);
      expect(reward.amount).toBe(50);
      expect(reward.idempotencyKey).toBe('referral-reward:ref-200');
      expect(qualifiedReferral.status).toBe(ReferralStatus.REWARDED);
      expect(qualifiedReferral.rewardedAt).toBeInstanceOf(Date);
      expect(usersService.applyReputationDeltaAtomic).toHaveBeenCalledWith(
        mockUserA.id,
        50,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'referral.rewarded',
        expect.objectContaining({
          referralId: 'ref-200',
          recipientId: mockUserA.id,
          amount: 50,
        }),
      );
    });

    it('returns existing reward without double-crediting when called multiple times (idempotency)', async () => {
      const rewardedReferral: Referral = {
        id: 'ref-200',
        referrerId: mockUserA.id,
        referredUserId: mockUserB.id,
        status: ReferralStatus.REWARDED,
        rewardedAt: new Date(),
      } as any;

      const existingReward: ReferralReward = {
        id: 'reward-already-credited',
        referralId: 'ref-200',
        recipientId: mockUserA.id,
        amount: 50,
        asset: 'XLM',
        status: ReferralRewardStatus.CREDITED,
        idempotencyKey: 'referral-reward:ref-200',
      } as any;

      referralsRepository.findOne.mockResolvedValue(rewardedReferral);
      referralRewardsRepository.findOne.mockResolvedValue(existingReward);

      const reward = await service.creditReward('ref-200', 50, 'XLM');

      expect(reward).toBe(existingReward);
      expect(referralRewardsRepository.create).not.toHaveBeenCalled();
      expect(usersService.applyReputationDeltaAtomic).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if referral does not exist', async () => {
      referralsRepository.findOne.mockResolvedValue(null);

      await expect(service.creditReward('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('query methods', () => {
    it('getReferralsForUser calculates correct status counts', async () => {
      referralsRepository.find.mockResolvedValue([
        { id: '1', status: ReferralStatus.PENDING, code: 'REF-A' },
        { id: '2', status: ReferralStatus.QUALIFIED, code: 'REF-A' },
        { id: '3', status: ReferralStatus.REWARDED, code: 'REF-A' },
      ]);

      const res = await service.getReferralsForUser(mockUserA.id);
      expect(res.total).toBe(3);
      expect(res.pending).toBe(1);
      expect(res.qualified).toBe(1);
      expect(res.rewarded).toBe(1);
      expect(res.referrals.length).toBe(3);
    });

    it('getRewardsForUser calculates total reward sum', async () => {
      referralRewardsRepository.find.mockResolvedValue([
        {
          id: '1',
          amount: '50',
          asset: 'XLM',
          status: ReferralRewardStatus.CREDITED,
        },
        {
          id: '2',
          amount: 50,
          asset: 'XLM',
          status: ReferralRewardStatus.CREDITED,
        },
      ]);

      const res = await service.getRewardsForUser(mockUserA.id);
      expect(res.totalRewards).toBe(2);
      expect(res.totalAmount).toBe(100);
    });
  });
});
