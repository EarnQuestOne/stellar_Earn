import { IsNotEmpty, IsUUID } from 'class-validator';

export class SubmissionCreatedEvent {
  @IsUUID()
  @IsNotEmpty()
  submissionId: string;

  @IsUUID()
  @IsNotEmpty()
  questId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  constructor(submissionId: string, questId: string, userId: string) {
    this.submissionId = submissionId;
    this.questId = questId;
    this.userId = userId;
  }
}
