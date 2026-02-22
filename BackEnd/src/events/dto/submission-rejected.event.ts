import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmissionRejectedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly submissionId: string;

    @IsString()
    @IsNotEmpty()
    public readonly userId: string;

    @IsString()
    public readonly reason: string;

    constructor(submissionId: string, userId: string, reason: string) {
        super();
        this.submissionId = submissionId;
        this.userId = userId;
        this.reason = reason;
    }
}
