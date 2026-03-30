import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RewardIssuedEvent, RewardClaimedEvent, RewardExpiredEvent } from '../dto/reward.event';
import { eventConfig } from '../../config/events.config';

@Injectable()
export class RewardListener {
  @OnEvent(eventConfig.events.reward.issued)
  async handleRewardIssued(event: RewardIssuedEvent): Promise<void> {
    console.log(`[EVENT] Reward issued: ${event.rewardId}`);
  }

  @OnEvent(eventConfig.events.reward.claimed)
  async handleRewardClaimed(event: RewardClaimedEvent): Promise<void> {
    console.log(`[EVENT] Reward claimed: ${event.rewardId}`);
  }

  @OnEvent(eventConfig.events.reward.expired)
  async handleRewardExpired(event: RewardExpiredEvent): Promise<void> {
    console.log(`[EVENT] Reward expired: ${event.rewardId}`);
  }
}