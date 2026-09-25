import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError, Repository } from 'typeorm';
import {
  Referral,
  ReferralStatus,
} from '../../referrals/entities/referral.entity';
import { ReferralReward } from '../../referrals/entities/referral-reward.entity';

/**
 * Credits the referrer's reward for a qualified referral, exactly once.
 *
 * Idempotency is enforced at the storage layer: `ReferralReward.referralId` is
 * unique, so a duplicate qualifying event that re-enqueues the same referral
 * cannot double-credit — the second insert is caught and treated as a no-op.
 * Anti-abuse re-validation (self-referral) runs before crediting; a failing
 * referral is moved to `REJECTED` (dead-lettered) instead of rewarded.
 *
 * Implemented as a plain injectable (invoked in-process) because the platform
 * does not run a BullMQ worker; the persisted referral/reward rows keep state
 * queryable and let a future queue-backed worker resume from them.
 */
@Injectable()
export class ReferralRewardProcessor {
  private readonly logger = new Logger(ReferralRewardProcessor.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly rewards: Repository<ReferralReward>,
    private readonly config: ConfigService,
  ) {}

  private rewardAmount(): string {
    // Documented, configurable reward (default 10 XLM = 100_000_000 stroops).
    return this.config.get<string>('REFERRAL_REWARD_STROOPS', '100000000');
  }

  /** Enqueue point: fire-and-forget so callers are never blocked on delivery. */
  enqueue(referralId: string): void {
    void this.process(referralId).catch((err) =>
      this.logger.error(
        `Referral reward processing failed for ${referralId}: ${(err as Error).message}`,
      ),
    );
  }

  /** Idempotently credits the reward for a qualified referral. */
  async process(referralId: string): Promise<void> {
    const referral = await this.referrals.findOne({
      where: { id: referralId },
    });
    if (!referral || referral.status === ReferralStatus.REWARDED) {
      return; // unknown or already rewarded — nothing to do
    }

    // Anti-abuse re-validation at credit time.
    if (referral.referrerUserId === referral.referredUserId) {
      referral.status = ReferralStatus.REJECTED;
      referral.rejectionReason = 'self-referral';
      await this.referrals.save(referral);
      this.logger.warn(
        `Referral ${referralId} rejected at credit time (self-referral)`,
      );
      return;
    }

    try {
      await this.rewards.save(
        this.rewards.create({
          referralId: referral.id,
          referrerUserId: referral.referrerUserId,
          referredUserId: referral.referredUserId,
          amount: this.rewardAmount(),
        }),
      );
    } catch (err) {
      // Unique(referralId) violation => already credited by a concurrent run.
      if (err instanceof QueryFailedError) {
        this.logger.log(`Referral ${referralId} already credited; skipping`);
        return;
      }
      throw err;
    }

    referral.status = ReferralStatus.REWARDED;
    referral.rewardedAt = new Date();
    await this.referrals.save(referral);
    this.logger.log(`Credited referral reward for ${referralId}`);
  }
}
