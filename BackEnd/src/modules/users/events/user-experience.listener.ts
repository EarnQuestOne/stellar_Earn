import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ISubmissionApprovedEvent } from '../../../events/interfaces/submission-events.interface';

@Injectable()
export class UserExperienceListener {
    private readonly logger = new Logger(UserExperienceListener.name);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    @OnEvent('submission.approved', { async: true })
    async handleSubmissionApproved(event: ISubmissionApprovedEvent) {
        this.logger.log(`[UserModule] Awarding experience to user: ${event.userId}`);
        
        // This is where a workflow starts
        // 1. Update user reputation/XP in DB
        // 2. Check if user leveled up
        // 3. If leveled up, emit 'user.level-up'
        
        const oldLevel = 1;
        const newLevel = 2;
        
        if (newLevel > oldLevel) {
            this.eventEmitter.emit('user.level-up', {
                userId: event.userId,
                oldLevel,
                newLevel,
                levelUpAt: new Date(),
            });
        }
    }
}
