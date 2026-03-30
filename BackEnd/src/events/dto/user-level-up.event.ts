import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class UserLevelUpEvent extends BaseEvent {
  @IsString()
  @IsNotEmpty()
  public readonly userId: string;

  @IsNumber()
  public readonly newLevel: number;

  constructor(userId: string, newLevel: number) {
    super();
    this.userId = userId;
    this.newLevel = newLevel;
  }
}
