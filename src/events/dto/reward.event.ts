import { BaseEvent } from './base.event';

export class RewardIssuedEvent extends BaseEvent {
  rewardId: string;
  amount: number;
  type: string;
  questId?: string;
}

export class RewardClaimedEvent extends BaseEvent {
  rewardId: string;
  claimedAt: Date;
  walletAddress: string;
}

export class RewardExpiredEvent extends BaseEvent {
  rewardId: string;
  expiredAt: Date;
}