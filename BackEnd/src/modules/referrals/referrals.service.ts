import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ReferralCode } from './entities/referral-code.entity';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { ReferralRewardProcessor } from '../jobs/processors/referral-reward.processor';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-ish, no ambiguous chars
const CODE_LENGTH = 8;

/**
 * Referral & invitation program: per-user codes, signup attribution with
 * anti-abuse checks, milestone-based qualification, and idempotent reward
 * crediting.
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    @InjectRepository(ReferralCode)
    private readonly codes: Repository<ReferralCode>,
    @InjectRepository(Referral)
    private readonly referrals: Repository<Referral>,
    @InjectRepository(ReferralReward)
    private readonly rewards: Repository<ReferralReward>,
    private readonly config: ConfigService,
    private readonly rewardProcessor: ReferralRewardProcessor,
  ) {}

  /** Returns the user's stable code, creating it once on first request. */
  async getOrCreateCode(userId: string): Promise<string> {
    const existing = await this.codes.findOne({ where: { userId } });
    if (existing) {
      return existing.code;
    }
    // Retry on the (rare) unique-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      try {
        const saved = await this.codes.save(
          this.codes.create({ userId, code }),
        );
        return saved.code;
      } catch (err) {
        if (err instanceof QueryFailedError) {
          // Either the code collided or this user's row was created concurrently.
          const raced = await this.codes.findOne({ where: { userId } });
          if (raced) {
            return raced.code;
          }
          continue;
        }
        throw err;
      }
    }
    throw new Error('Failed to allocate a unique referral code');
  }

  /** The user's code plus a shareable invitation link. */
  async getMyReferralInfo(
    userId: string,
  ): Promise<{ code: string; link: string }> {
    const code = await this.getOrCreateCode(userId);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    return { code, link: `${appUrl}/signup?ref=${code}` };
  }

  /** Resolves a referral code to its owning user id, or null if unknown. */
  async resolveCodeOwner(code: string): Promise<string | null> {
    const row = await this.codes.findOne({ where: { code } });
    return row ? row.userId : null;
  }

  /**
   * Records a pending attribution for a newly signed-up user. No-op when no
   * code is supplied. Rejects self-referral, unknown codes, duplicate
   * attribution, and circular attribution (A refers B while B already referred A).
   */
  async recordSignupAttribution(
    referredUserId: string,
    code?: string | null,
  ): Promise<Referral | null> {
    if (!code) {
      return null;
    }
    const referrerUserId = await this.resolveCodeOwner(code);
    if (!referrerUserId) {
      this.logger.warn(`Signup used unknown referral code '${code}'`);
      return null;
    }
    if (referrerUserId === referredUserId) {
      this.logger.warn(`Rejected self-referral for user ${referredUserId}`);
      return null;
    }
    // Duplicate: this user was already attributed to someone.
    const already = await this.referrals.findOne({ where: { referredUserId } });
    if (already) {
      return already;
    }
    // Circular: the new user previously referred the code owner.
    const circular = await this.referrals.findOne({
      where: { referrerUserId: referredUserId, referredUserId: referrerUserId },
    });
    if (circular) {
      this.logger.warn(
        `Rejected circular referral between ${referrerUserId} and ${referredUserId}`,
      );
      return null;
    }

    try {
      return await this.referrals.save(
        this.referrals.create({
          referrerUserId,
          referredUserId,
          code,
          status: ReferralStatus.PENDING,
        }),
      );
    } catch (err) {
      // Unique(referredUserId) — a concurrent signup already attributed them.
      if (err instanceof QueryFailedError) {
        return this.referrals.findOne({ where: { referredUserId } });
      }
      throw err;
    }
  }

  /**
   * Qualifying-milestone hook. When a referred user reaches the milestone (their
   * first approved submission), moves a PENDING referral to QUALIFIED and
   * enqueues idempotent reward crediting. Safe to call on every approval —
   * once qualified/rewarded it is a no-op.
   */
  async onQualifyingApproval(referredUserId: string): Promise<void> {
    const referral = await this.referrals.findOne({
      where: { referredUserId, status: ReferralStatus.PENDING },
    });
    if (!referral) {
      return;
    }
    referral.status = ReferralStatus.QUALIFIED;
    referral.qualifiedAt = new Date();
    await this.referrals.save(referral);
    this.rewardProcessor.enqueue(referral.id);
  }

  /** Referrals the user has made, newest first. */
  listMyReferrals(userId: string): Promise<Referral[]> {
    return this.referrals.find({
      where: { referrerUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Rewards credited to the user, newest first. */
  listMyRewards(userId: string): Promise<ReferralReward[]> {
    return this.rewards.find({
      where: { referrerUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  private generateCode(): string {
    const bytes = crypto.randomBytes(CODE_LENGTH);
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return code;
  }
}
