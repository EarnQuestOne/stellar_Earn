import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmissionApprovedEvent extends BaseEvent {
  @IsString()
  @IsNotEmpty()
  public readonly submissionId: string;

  @IsString()
  @IsNotEmpty()
  public readonly questId: string;

  @IsString()
  @IsNotEmpty()
  public readonly verifierId: string;

  constructor(submissionId: string, questId: string, verifierId: string) {
    super();
    this.submissionId = submissionId;
    this.questId = questId;
    this.verifierId = verifierId;
  }
}
