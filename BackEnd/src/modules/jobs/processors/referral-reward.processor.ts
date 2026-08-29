import {
  Injectable,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { JobResult } from '../job.types';
import {
  Referral,
  ReferralStatus,
} from '../../referrals/entities/referral.entity';
import {
  ReferralReward,
  ReferralRewardStatus,
} from '../../referrals/entities/referral-reward.entity';
import { ReferralsService } from '../../referrals/referrals.service';
import { UsersService } from '../../users/users.service';

export interface ReferralRewardPayload {
  referralId: string;
  referrerId?: string;
  referredUserId?: string;
  amount?: number;
  asset?: string;
}

/**
 * Referral Reward Processor
 *
 * Processes referral qualification and credits rewards idempotently.
 * Performs anti-abuse validation and moves the referral to REWARDED (or REJECTED).
 */
@Injectable()
export class ReferralRewardProcessor {
  private readonly logger = new Logger(ReferralRewardProcessor.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly referralRewardRepository: Repository<ReferralReward>,
    @Optional()
    @Inject(forwardRef(() => ReferralsService))
    private readonly referralsService?: ReferralsService,
    @Optional()
    @Inject(forwardRef(() => UsersService))
    private readonly usersService?: UsersService,
  ) {}

  async process(job: Job<ReferralRewardPayload>): Promise<JobResult> {
    const { referralId, amount = 50, asset = 'XLM' } = job.data;

    this.logger.log(
      `Processing referral reward job ${job.id}: referral=${referralId}, amount=${amount} ${asset}`,
    );

    try {
      const referral = await this.referralRepository.findOne({
        where: { id: referralId },
      });

      if (!referral) {
        throw new Error(`Referral not found: ${referralId}`);
      }

      // Check if already rewarded
      if (referral.status === ReferralStatus.REWARDED) {
        this.logger.log(
          `Referral ${referralId} is already rewarded. Skipping duplicate crediting.`,
        );
        return {
          success: true,
          data: {
            referralId,
            status: ReferralStatus.REWARDED,
            alreadyRewarded: true,
          },
          duration: Date.now() - job.timestamp,
        };
      }

      // Anti-abuse: self-referral
      if (referral.referrerId === referral.referredUserId) {
        referral.status = ReferralStatus.REJECTED;
        referral.rejectionReason = 'Self-referral detected';
        await this.referralRepository.save(referral);
        this.logger.warn(
          `Rejected referral ${referralId}: Self-referral detected`,
        );
        return {
          success: false,
          error: 'Self-referral detected',
          data: { referralId, status: ReferralStatus.REJECTED },
          duration: Date.now() - job.timestamp,
        };
      }

      // Anti-abuse: circular attribution
      const isCircular = this.referralsService
        ? await this.referralsService.isCircularAttribution(
            referral.referrerId,
            referral.referredUserId,
          )
        : false;
      if (isCircular) {
        referral.status = ReferralStatus.REJECTED;
        referral.rejectionReason = 'Circular referral detected';
        await this.referralRepository.save(referral);
        this.logger.warn(
          `Rejected referral ${referralId}: Circular referral detected`,
        );
        return {
          success: false,
          error: 'Circular referral detected',
          data: { referralId, status: ReferralStatus.REJECTED },
          duration: Date.now() - job.timestamp,
        };
      }

      // Credit reward idempotently
      let reward: ReferralReward;
      if (this.referralsService) {
        reward = await this.referralsService.creditReward(
          referralId,
          amount,
          asset,
        );
      } else {
        const idempotencyKey = `referral-reward:${referral.id}`;
        const existing = await this.referralRewardRepository.findOne({
          where: { idempotencyKey },
        });
        if (existing) {
          reward = existing;
        } else {
          reward = this.referralRewardRepository.create({
            referralId: referral.id,
            recipientId: referral.referrerId,
            amount,
            asset,
            status: ReferralRewardStatus.CREDITED,
            idempotencyKey,
            notes: `Referral reward for user ${referral.referredUserId}`,
          });
          reward = await this.referralRewardRepository.save(reward);
          referral.status = ReferralStatus.REWARDED;
          referral.rewardedAt = new Date();
          await this.referralRepository.save(referral);
        }
      }

      return {
        success: true,
        data: {
          referralId,
          rewardId: reward.id,
          recipientId: reward.recipientId,
          amount: reward.amount,
          asset: reward.asset,
          status: ReferralStatus.REWARDED,
        },
        duration: Date.now() - job.timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Error processing referral reward for referral ${referralId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
