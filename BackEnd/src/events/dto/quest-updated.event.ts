import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class QuestUpdatedEvent extends BaseEvent {
  @IsString()
  @IsNotEmpty()
  public readonly questId: string;

  @IsObject()
  @IsOptional()
  public readonly updates: Record<string, any>;

  constructor(questId: string, updates: Record<string, any>) {
    super();
    this.questId = questId;
    this.updates = updates;
  }
}
