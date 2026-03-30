import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmissionReceivedEvent extends BaseEvent {
  @IsString()
  @IsNotEmpty()
  public readonly submissionId: string;

  @IsString()
  @IsNotEmpty()
  public readonly questId: string;

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;

  constructor(submissionId: string, questId: string, userId: string) {
    super();
    this.submissionId = submissionId;
    this.questId = questId;
    this.userId = userId;
  }
}
