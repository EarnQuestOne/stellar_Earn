import { Test, TestingModule } from '@nestjs/testing';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { ReferralStatus } from './entities/referral.entity';
import { ReferralRewardStatus } from './entities/referral-reward.entity';
import type { AuthUser } from '../auth/auth.service';

describe('ReferralsController', () => {
  let controller: ReferralsController;
  let service: ReferralsService;

  const mockUser: AuthUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    stellarAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    role: 'USER',
  };

  const mockReferralsService = {
    getReferralCode: jest.fn(() => ({
      code: 'REF-123E4567',
      referralLink: 'https://stellarearn.com/signup?ref=REF-123E4567',
      referrerId: mockUser.id,
    })),
    getReferralsForUser: jest.fn(() =>
      Promise.resolve({
        referrals: [
          {
            id: 'ref-1',
            referredUserId: 'user-2',
            code: 'REF-123E4567',
            status: ReferralStatus.PENDING,
            rejectionReason: null,
            qualifiedAt: null,
            rewardedAt: null,
            createdAt: new Date(),
          },
        ],
        total: 1,
        pending: 1,
        qualified: 0,
        rewarded: 0,
      }),
    ),
    getRewardsForUser: jest.fn(() =>
      Promise.resolve({
        rewards: [
          {
            id: 'reward-1',
            referralId: 'ref-1',
            recipientId: mockUser.id,
            amount: 50,
            asset: 'XLM',
            status: ReferralRewardStatus.CREDITED,
            idempotencyKey: 'referral-reward:ref-1',
            createdAt: new Date(),
          },
        ],
        totalAmount: 50,
        totalRewards: 1,
      }),
    ),
    getReferralStats: jest.fn(() =>
      Promise.resolve({
        totalReferrals: 1,
        pendingReferrals: 1,
        qualifiedReferrals: 0,
        rewardedReferrals: 0,
        totalRewardsCredited: 0,
      }),
    ),
    recordAttribution: jest.fn(() =>
      Promise.resolve({
        id: 'new-ref-id',
        status: ReferralStatus.PENDING,
        code: 'REF-99999999',
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralsController],
      providers: [
        {
          provide: ReferralsService,
          useValue: mockReferralsService,
        },
      ],
    }).compile();

    controller = module.get<ReferralsController>(ReferralsController);
    service = module.get<ReferralsService>(ReferralsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns my referral code and link', () => {
    const result = controller.getMyReferralCode(mockUser);
    expect(result.code).toBe('REF-123E4567');
    expect(service.getReferralCode).toHaveBeenCalledWith(mockUser);
  });

  it('returns my referrals list and status breakdown', async () => {
    const result = await controller.getMyReferrals(mockUser);
    expect(result.total).toBe(1);
    expect(result.pending).toBe(1);
    expect(service.getReferralsForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('returns my credited rewards ledger', async () => {
    const result = await controller.getMyRewards(mockUser);
    expect(result.totalAmount).toBe(50);
    expect(service.getRewardsForUser).toHaveBeenCalledWith(mockUser.id);
  });

  it('returns my referral statistics', async () => {
    const result = await controller.getMyStats(mockUser);
    expect(result.totalReferrals).toBe(1);
    expect(service.getReferralStats).toHaveBeenCalledWith(mockUser.id);
  });

  it('attributes a referral code for current user', async () => {
    const result = await controller.attributeReferral(
      { code: 'REF-99999999' },
      mockUser,
    );
    expect(result.success).toBe(true);
    expect(result.referralId).toBe('new-ref-id');
    expect(service.recordAttribution).toHaveBeenCalledWith(
      mockUser.id,
      'REF-99999999',
    );
  });
});
