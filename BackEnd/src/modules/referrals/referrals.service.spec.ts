import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from './referrals.service';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralRewardProcessor } from '../jobs/processors/referral-reward.processor';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function repo<T>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => Promise.resolve({ id: 'ref-1', ...x })),
  };
}

describe('ReferralsService', () => {
  let service: ReferralsService;
  let codes: MockRepo<ReferralCode>;
  let referrals: MockRepo<Referral>;
  let rewards: MockRepo<ReferralReward>;
  let processor: { enqueue: jest.Mock };

  beforeEach(() => {
    codes = repo<ReferralCode>();
    referrals = repo<Referral>();
    rewards = repo<ReferralReward>();
    processor = { enqueue: jest.fn() };
    const config = {
      get: jest.fn((_k: string, d?: unknown) => d),
    } as unknown as ConfigService;
    service = new ReferralsService(
      codes as unknown as Repository<ReferralCode>,
      referrals as unknown as Repository<Referral>,
      rewards as unknown as Repository<ReferralReward>,
      config,
      processor as unknown as ReferralRewardProcessor,
    );
  });

  describe('recordSignupAttribution', () => {
    it('creates a pending attribution for a valid code', async () => {
      codes.findOne!.mockResolvedValue({ userId: 'referrer', code: 'ABC123' });
      referrals.findOne!.mockResolvedValue(null); // no duplicate, no circular

      const result = await service.recordSignupAttribution('newuser', 'ABC123');

      expect(referrals.save).toHaveBeenCalledTimes(1);
      expect(referrals.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerUserId: 'referrer',
          referredUserId: 'newuser',
          status: ReferralStatus.PENDING,
        }),
      );
      expect(result).not.toBeNull();
    });

    it('is a no-op when no code is supplied', async () => {
      const result = await service.recordSignupAttribution(
        'newuser',
        undefined,
      );
      expect(result).toBeNull();
      expect(referrals.save).not.toHaveBeenCalled();
    });

    it('rejects self-referral', async () => {
      codes.findOne!.mockResolvedValue({ userId: 'newuser', code: 'SELF' });
      const result = await service.recordSignupAttribution('newuser', 'SELF');
      expect(result).toBeNull();
      expect(referrals.save).not.toHaveBeenCalled();
    });

    it('rejects a duplicate attribution (returns the existing one)', async () => {
      codes.findOne!.mockResolvedValue({ userId: 'referrer', code: 'ABC' });
      const existing = { id: 'existing' } as Referral;
      referrals.findOne!.mockResolvedValueOnce(existing); // duplicate lookup hits
      const result = await service.recordSignupAttribution('newuser', 'ABC');
      expect(result).toBe(existing);
      expect(referrals.save).not.toHaveBeenCalled();
    });

    it('rejects circular attribution', async () => {
      codes.findOne!.mockResolvedValue({ userId: 'referrer', code: 'ABC' });
      referrals
        .findOne!.mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce({ id: 'circular' }); // newuser previously referred referrer
      const result = await service.recordSignupAttribution('newuser', 'ABC');
      expect(result).toBeNull();
      expect(referrals.save).not.toHaveBeenCalled();
    });
  });

  describe('onQualifyingApproval', () => {
    it('moves a pending referral to qualified and enqueues the reward', async () => {
      referrals.findOne!.mockResolvedValue({
        id: 'ref-1',
        status: ReferralStatus.PENDING,
      });

      await service.onQualifyingApproval('newuser');

      expect(referrals.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReferralStatus.QUALIFIED }),
      );
      expect(processor.enqueue).toHaveBeenCalledWith('ref-1');
    });

    it('is a no-op when the user has no pending referral', async () => {
      referrals.findOne!.mockResolvedValue(null);
      await service.onQualifyingApproval('newuser');
      expect(processor.enqueue).not.toHaveBeenCalled();
    });
  });
});
