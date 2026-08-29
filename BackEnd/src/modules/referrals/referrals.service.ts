import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import {
  ReferralReward,
  ReferralRewardStatus,
} from './entities/referral-reward.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';
import { JobType } from '../jobs/job.types';
import {
  ReferralCodeResponseDto,
  ReferralListResponseDto,
  ReferralRewardsResponseDto,
  ReferralStatsResponseDto,
} from './dto/referral.dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralsRepository: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly referralRewardsRepository: Repository<ReferralReward>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Optional()
    @Inject(forwardRef(() => UsersService))
    private readonly usersService?: UsersService,
    @Optional()
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService?: JobsService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Generates a stable, unique referral code for a user based on their ID.
   */
  generateReferralCode(userId: string): string {
    const cleanId = userId.replace(/-/g, '').toUpperCase();
    const slice =
      cleanId.length >= 8 ? cleanId.slice(0, 8) : cleanId.padEnd(8, '0');
    return `REF-${slice}`;
  }

  /**
   * Returns referral code and sharable invitation link for the authenticated user.
   */
  getReferralCode(user: { id: string }): ReferralCodeResponseDto {
    const code = this.generateReferralCode(user.id);
    const baseUrl =
      this.configService.get<string>('APP_URL') ||
      process.env.APP_URL ||
      'https://stellarearn.com';
    const referralLink = `${baseUrl.replace(/\/$/, '')}/signup?ref=${code}`;

    return {
      code,
      referralLink,
      referrerId: user.id,
    };
  }

  /**
   * Resolves a referral code to its owning User entity.
   */
  async resolveCode(code: string): Promise<User | null> {
    if (!code || typeof code !== 'string') {
      return null;
    }

    const trimmed = code.trim();
    if (!trimmed) return null;

    let searchPrefix = trimmed;
    if (trimmed.toUpperCase().startsWith('REF-')) {
      searchPrefix = trimmed.slice(4).trim();
    }

    // 1. Match by user ID prefix
    if (searchPrefix.length >= 4) {
      const userByPrefix = await this.usersRepository
        .createQueryBuilder('user')
        .where("UPPER(REPLACE(user.id::text, '-', '')) LIKE :prefix", {
          prefix: `${searchPrefix.toUpperCase()}%`,
        })
        .getOne();

      if (userByPrefix) {
        return userByPrefix;
      }
    }

    // 2. Match by exact username
    const userByUsername = await this.usersRepository.findOne({
      where: { username: trimmed },
    });
    if (userByUsername) {
      return userByUsername;
    }

    // 3. Match by exact stellarAddress
    if (trimmed.length === 56 && trimmed.startsWith('G')) {
      const userByAddress = await this.usersRepository.findOne({
        where: { stellarAddress: trimmed },
      });
      if (userByAddress) {
        return userByAddress;
      }
    }

    // 4. Match by exact user ID
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      )
    ) {
      const userById = await this.usersRepository.findOne({
        where: { id: trimmed },
      });
      if (userById) {
        return userById;
      }
    }

    return null;
  }

  /**
   * Checks if attributing `referrerId` as the referrer for `candidateReferredUserId`
   * would introduce a circular referral relationship of any depth.
   */
  async isCircularAttribution(
    referrerId: string,
    candidateReferredUserId: string,
  ): Promise<boolean> {
    if (referrerId === candidateReferredUserId) {
      return true;
    }

    const visited = new Set<string>();
    let currentId: string | null = referrerId;

    while (currentId) {
      if (currentId === candidateReferredUserId) {
        return true;
      }

      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const parentReferral = await this.referralsRepository.findOne({
        where: { referredUserId: currentId },
      });

      if (!parentReferral) {
        break;
      }

      currentId = parentReferral.referrerId;
    }

    return false;
  }

  /**
   * Records a pending attribution for a referred user using a referral code.
   * Performs anti-abuse checks: rejection of self-referrals, duplicate attributions,
   * and circular chains.
   */
  async recordAttribution(
    referredUserId: string,
    referralCode: string,
  ): Promise<Referral> {
    if (!referralCode || !referralCode.trim()) {
      throw new BadRequestException('Referral code is required');
    }

    // Duplicate check: each user can be referred at most once
    const existing = await this.referralsRepository.findOne({
      where: { referredUserId },
    });
    if (existing) {
      throw new ConflictException('User has already been referred');
    }

    const referrer = await this.resolveCode(referralCode);
    if (!referrer) {
      throw new BadRequestException('Invalid referral code');
    }

    // Self-referral check
    if (referrer.id === referredUserId) {
      throw new BadRequestException('Self-referral is not allowed');
    }

    // Circular attribution check
    const isCircular = await this.isCircularAttribution(
      referrer.id,
      referredUserId,
    );
    if (isCircular) {
      throw new BadRequestException(
        'Circular referral attribution is not allowed',
      );
    }

    const referral = this.referralsRepository.create({
      referrerId: referrer.id,
      referredUserId,
      code: referralCode.trim().toUpperCase(),
      status: ReferralStatus.PENDING,
    });

    const saved = await this.referralsRepository.save(referral);

    this.logger.log(
      `Recorded referral attribution: referrer=${referrer.id}, referred=${referredUserId}, code=${saved.code}`,
    );

    this.eventEmitter?.emit('referral.created', {
      referralId: saved.id,
      referrerId: saved.referrerId,
      referredUserId: saved.referredUserId,
      code: saved.code,
    });

    return saved;
  }

  /**
   * Lists referrals made by a given user (referrer).
   */
  async getReferralsForUser(
    referrerId: string,
  ): Promise<ReferralListResponseDto> {
    const referrals = await this.referralsRepository.find({
      where: { referrerId },
      order: { createdAt: 'DESC' },
    });

    const total = referrals.length;
    const pending = referrals.filter(
      (r) => r.status === ReferralStatus.PENDING,
    ).length;
    const qualified = referrals.filter(
      (r) => r.status === ReferralStatus.QUALIFIED,
    ).length;
    const rewarded = referrals.filter(
      (r) => r.status === ReferralStatus.REWARDED,
    ).length;

    return {
      referrals: referrals.map((r) => ({
        id: r.id,
        referredUserId: r.referredUserId,
        code: r.code,
        status: r.status,
        rejectionReason: r.rejectionReason,
        qualifiedAt: r.qualifiedAt,
        rewardedAt: r.rewardedAt,
        createdAt: r.createdAt,
      })),
      total,
      pending,
      qualified,
      rewarded,
    };
  }

  /**
   * Returns credited rewards ledger for a given user.
   */
  async getRewardsForUser(
    recipientId: string,
  ): Promise<ReferralRewardsResponseDto> {
    const rewards = await this.referralRewardsRepository.find({
      where: { recipientId },
      order: { createdAt: 'DESC' },
    });

    const totalAmount = rewards.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );

    return {
      rewards: rewards.map((r) => ({
        id: r.id,
        referralId: r.referralId,
        recipientId: r.recipientId,
        amount: Number(r.amount),
        asset: r.asset,
        status: r.status,
        idempotencyKey: r.idempotencyKey,
        createdAt: r.createdAt,
      })),
      totalAmount,
      totalRewards: rewards.length,
    };
  }

  /**
   * Returns referral performance statistics for a given user.
   */
  async getReferralStats(userId: string): Promise<ReferralStatsResponseDto> {
    const referrals = await this.referralsRepository.find({
      where: { referrerId: userId },
    });
    const rewards = await this.referralRewardsRepository.find({
      where: { recipientId: userId, status: ReferralRewardStatus.CREDITED },
    });

    const totalRewardsCredited = rewards.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );

    return {
      totalReferrals: referrals.length,
      pendingReferrals: referrals.filter(
        (r) => r.status === ReferralStatus.PENDING,
      ).length,
      qualifiedReferrals: referrals.filter(
        (r) => r.status === ReferralStatus.QUALIFIED,
      ).length,
      rewardedReferrals: referrals.filter(
        (r) => r.status === ReferralStatus.REWARDED,
      ).length,
      totalRewardsCredited,
    };
  }

  /**
   * Qualifying-event hook: Called when a referred user accomplishes a qualifying
   * milestone (such as their first approved submission). Transitions referral to
   * QUALIFIED and enqueues reward processing.
   */
  async handleQualifyingSubmission(
    userId: string,
    submissionId?: string,
  ): Promise<Referral | null> {
    const referral = await this.referralsRepository.findOne({
      where: {
        referredUserId: userId,
        status: ReferralStatus.PENDING,
      },
    });

    if (!referral) {
      return null;
    }

    referral.status = ReferralStatus.QUALIFIED;
    referral.qualifiedAt = new Date();
    const updated = await this.referralsRepository.save(referral);

    this.logger.log(
      `Referral qualified for user ${userId} (referral ${referral.id}, submission ${submissionId || 'milestone'})`,
    );

    this.eventEmitter?.emit('referral.qualified', {
      referralId: updated.id,
      referrerId: updated.referrerId,
      referredUserId: updated.referredUserId,
      submissionId,
      qualifiedAt: updated.qualifiedAt,
    });

    // Enqueue reward processing in background queue if available, otherwise credit directly
    if (this.jobsService) {
      try {
        await this.jobsService.addJob(
          QUEUES.REFERRALS,
          {
            referralId: updated.id,
            referrerId: updated.referrerId,
            referredUserId: updated.referredUserId,
            amount: 50,
            asset: 'XLM',
          },
          {},
          JobType.REFERRAL_REWARD,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to enqueue referral reward job for ${updated.id}, crediting directly: ${err.message}`,
        );
        await this.creditReward(updated.id).catch((directErr) => {
          this.logger.error(
            `Direct reward crediting failed for ${updated.id}: ${directErr.message}`,
          );
        });
      }
    } else {
      await this.creditReward(updated.id).catch((directErr) => {
        this.logger.error(
          `Direct reward crediting failed for ${updated.id}: ${directErr.message}`,
        );
      });
    }

    return updated;
  }

  /**
   * Idempotently credits a referral reward to the referrer.
   * Performs anti-abuse validations, records the ledger entry, and marks the
   * referral as REWARDED.
   */
  async creditReward(
    referralId: string,
    amount: number = 50,
    asset: string = 'XLM',
  ): Promise<ReferralReward> {
    const referral = await this.referralsRepository.findOne({
      where: { id: referralId },
    });

    if (!referral) {
      throw new NotFoundException(`Referral not found: ${referralId}`);
    }

    const idempotencyKey = `referral-reward:${referral.id}`;

    // Check if reward was already credited
    const existingReward = await this.referralRewardsRepository.findOne({
      where: { idempotencyKey },
    });

    if (existingReward) {
      if (referral.status !== ReferralStatus.REWARDED) {
        referral.status = ReferralStatus.REWARDED;
        referral.rewardedAt = referral.rewardedAt || new Date();
        await this.referralsRepository.save(referral);
      }
      return existingReward;
    }

    // Anti-abuse checks before reward crediting
    if (referral.referrerId === referral.referredUserId) {
      referral.status = ReferralStatus.REJECTED;
      referral.rejectionReason = 'Self-referral detected';
      await this.referralsRepository.save(referral);
      throw new BadRequestException('Self-referral detected');
    }

    const isCircular = await this.isCircularAttribution(
      referral.referrerId,
      referral.referredUserId,
    );
    if (isCircular) {
      referral.status = ReferralStatus.REJECTED;
      referral.rejectionReason = 'Circular referral detected';
      await this.referralsRepository.save(referral);
      throw new BadRequestException('Circular referral detected');
    }

    const reward = this.referralRewardsRepository.create({
      referralId: referral.id,
      recipientId: referral.referrerId,
      amount,
      asset,
      status: ReferralRewardStatus.CREDITED,
      idempotencyKey,
      notes: `Referral reward for user ${referral.referredUserId}`,
    });

    const savedReward = await this.referralRewardsRepository.save(reward);

    referral.status = ReferralStatus.REWARDED;
    referral.rewardedAt = new Date();
    if (!referral.qualifiedAt) {
      referral.qualifiedAt = new Date();
    }
    await this.referralsRepository.save(referral);

    if (this.usersService) {
      try {
        await this.usersService.applyReputationDeltaAtomic(
          referral.referrerId,
          amount,
        );
      } catch (e) {
        this.logger.warn(
          `Could not apply XP reward to user ${referral.referrerId}: ${e.message}`,
        );
      }
    }

    this.logger.log(
      `Credited referral reward ${savedReward.id} (${amount} ${asset}) to referrer ${referral.referrerId}`,
    );

    this.eventEmitter?.emit('referral.rewarded', {
      rewardId: savedReward.id,
      referralId: referral.id,
      recipientId: referral.referrerId,
      amount,
      asset,
      rewardedAt: referral.rewardedAt,
    });

    return savedReward;
  }
}
