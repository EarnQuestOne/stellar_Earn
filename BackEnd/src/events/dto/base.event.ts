import { IsDate, IsOptional, IsString } from 'class-validator';

export abstract class BaseEvent {
  @IsDate()
  public readonly timestamp: Date;

  @IsOptional()
  @IsString()
  public readonly correlationId?: string;

  constructor() {
    this.timestamp = new Date();
  }
}
