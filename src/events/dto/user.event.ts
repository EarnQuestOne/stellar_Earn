import { BaseEvent } from './base.event';

export class UserRegisteredEvent extends BaseEvent {
  email: string;
  walletAddress: string;
  referralCode?: string;
}

export class UserVerifiedEvent extends BaseEvent {
  verificationMethod: string;
}

export class UserUpdatedEvent extends BaseEvent {
  updates: Record<string, any>;
}