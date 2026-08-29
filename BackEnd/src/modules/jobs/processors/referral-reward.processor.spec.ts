import { ReferralRewardProcessor } from './referral-reward.processor';
import { ReferralStatus } from '../../referrals/entities/referral.entity';
import { ReferralRewardStatus } from '../../referrals/entities/referral-reward.entity';

describe('ReferralRewardProcessor', () => {
  let processor: ReferralRewardProcessor;
  let referralRepository: any;
  let referralRewardRepository: any;
  let referralsService: any;
  let usersService: any;

  const mockJob: any = {
    id: 'job-1',
    timestamp: Date.now() - 100,
    data: {
      referralId: 'ref-1',
      referrerId: 'user-a',
      referredUserId: 'user-b',
      amount: 50,
      asset: 'XLM',
    },
  };

  beforeEach(() => {
    referralRepository = {
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };
    referralRewardRepository = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'reward-1' })),
      save: jest.fn((e) => Promise.resolve({ ...e, id: 'reward-1' })),
    };
    referralsService = {
      isCircularAttribution: jest.fn().mockResolvedValue(false),
      creditReward: jest.fn().mockResolvedValue({
        id: 'reward-1',
        referralId: 'ref-1',
        recipientId: 'user-a',
        amount: 50,
        asset: 'XLM',
        status: ReferralRewardStatus.CREDITED,
      }),
    };
    usersService = {
      applyReputationDeltaAtomic: jest.fn().mockResolvedValue({}),
    };

    processor = new ReferralRewardProcessor(
      referralRepository,
      referralRewardRepository,
      referralsService,
      usersService,
    );
  });

  it('successfully processes referral reward job', async () => {
    referralRepository.findOne.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'user-a',
      referredUserId: 'user-b',
      status: ReferralStatus.QUALIFIED,
    });

    const result = await processor.process(mockJob);

    expect(result.success).toBe(true);
    expect(result.data.rewardId).toBe('reward-1');
    expect(referralsService.creditReward).toHaveBeenCalledWith(
      'ref-1',
      50,
      'XLM',
    );
  });

  it('skips duplicate reward crediting when referral is already REWARDED (idempotency)', async () => {
    referralRepository.findOne.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'user-a',
      referredUserId: 'user-b',
      status: ReferralStatus.REWARDED,
    });

    const result = await processor.process(mockJob);

    expect(result.success).toBe(true);
    expect(result.data.alreadyRewarded).toBe(true);
    expect(referralsService.creditReward).not.toHaveBeenCalled();
  });

  it('rejects self-referral abuse and marks referral REJECTED', async () => {
    referralRepository.findOne.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'user-a',
      referredUserId: 'user-a', // self referral
      status: ReferralStatus.QUALIFIED,
    });

    const result = await processor.process(mockJob);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Self-referral detected');
    expect(referralRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReferralStatus.REJECTED,
        rejectionReason: 'Self-referral detected',
      }),
    );
    expect(referralsService.creditReward).not.toHaveBeenCalled();
  });

  it('rejects circular attribution abuse and marks referral REJECTED', async () => {
    referralRepository.findOne.mockResolvedValue({
      id: 'ref-1',
      referrerId: 'user-a',
      referredUserId: 'user-b',
      status: ReferralStatus.QUALIFIED,
    });
    referralsService.isCircularAttribution.mockResolvedValue(true);

    const result = await processor.process(mockJob);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Circular referral detected');
    expect(referralRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ReferralStatus.REJECTED,
        rejectionReason: 'Circular referral detected',
      }),
    );
  });

  it('throws when referral does not exist', async () => {
    referralRepository.findOne.mockResolvedValue(null);

    await expect(processor.process(mockJob)).rejects.toThrow(
      'Referral not found: ref-1',
    );
  });
});
