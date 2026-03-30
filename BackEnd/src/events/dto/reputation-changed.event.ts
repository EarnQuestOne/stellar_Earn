import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class ReputationChangedEvent extends BaseEvent {
  @IsString()
  @IsNotEmpty()
  public readonly userId: string;

  @IsNumber()
  public readonly change: number;

  @IsNumber()
  public readonly newReputation: number;

  constructor(userId: string, change: number, newReputation: number) {
    super();
    this.userId = userId;
    this.change = change;
    this.newReputation = newReputation;
  }
}
