import { QueryFailedError, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ReferralRewardProcessor } from './referral-reward.processor';
import {
  Referral,
  ReferralStatus,
} from '../../referrals/entities/referral.entity';
import { ReferralReward } from '../../referrals/entities/referral-reward.entity';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('ReferralRewardProcessor', () => {
  let processor: ReferralRewardProcessor;
  let referrals: MockRepo<Referral>;
  let rewards: MockRepo<ReferralReward>;

  beforeEach(() => {
    referrals = {
      findOne: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    rewards = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    const config = {
      get: jest.fn((_k: string, d?: unknown) => d),
    } as unknown as ConfigService;
    processor = new ReferralRewardProcessor(
      referrals as unknown as Repository<Referral>,
      rewards as unknown as Repository<ReferralReward>,
      config,
    );
  });

  it('credits a qualified referral exactly once and marks it rewarded', async () => {
    referrals.findOne!.mockResolvedValue({
      id: 'ref-1',
      referrerUserId: 'a',
      referredUserId: 'b',
      status: ReferralStatus.QUALIFIED,
    });

    await processor.process('ref-1');

    expect(rewards.save).toHaveBeenCalledTimes(1);
    expect(referrals.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReferralStatus.REWARDED }),
    );
  });

  it('is a no-op when the referral is already rewarded', async () => {
    referrals.findOne!.mockResolvedValue({
      id: 'ref-1',
      status: ReferralStatus.REWARDED,
    });
    await processor.process('ref-1');
    expect(rewards.save).not.toHaveBeenCalled();
  });

  it('treats a duplicate reward insert as an idempotent no-op', async () => {
    referrals.findOne!.mockResolvedValue({
      id: 'ref-1',
      referrerUserId: 'a',
      referredUserId: 'b',
      status: ReferralStatus.QUALIFIED,
    });
    rewards.save!.mockRejectedValue(
      new QueryFailedError('insert', [], new Error('duplicate key')),
    );

    await processor.process('ref-1');

    // The reward insert raced/duplicated, so the referral is not re-marked.
    expect(referrals.save).not.toHaveBeenCalled();
  });

  it('rejects a self-referral at credit time instead of rewarding', async () => {
    referrals.findOne!.mockResolvedValue({
      id: 'ref-1',
      referrerUserId: 'same',
      referredUserId: 'same',
      status: ReferralStatus.QUALIFIED,
    });

    await processor.process('ref-1');

    expect(rewards.save).not.toHaveBeenCalled();
    expect(referrals.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: ReferralStatus.REJECTED }),
    );
  });
});
