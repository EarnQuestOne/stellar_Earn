import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../dto/user-created.event';
import { UserUpdatedEvent } from '../dto/user-updated.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class UserListener {
    private readonly logger = new Logger(UserListener.name);

    @OnEvent('user.created', { async: true })
    @Retry(3, 2000)
    async handleUserCreatedEvent(event: UserCreatedEvent) {
        this.logger.log(`Handling user.created for user: ${event.username} (${event.userId})`);

        try {
            // Simulate async processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.logger.log(`Successfully processed user.created for ${event.userId}`);
        } catch (error) {
            this.logger.error(`Failed to process user.created for ${event.userId}: ${error.message}`);
            throw error;
        }
    }

    @OnEvent('user.updated', { async: true })
    @Retry(3, 1000)
    async handleUserUpdatedEvent(event: UserUpdatedEvent) {
        this.logger.log(`Handling user.updated for user: ${event.userId}. Updated fields: ${event.updatedFields.join(', ')}`);
    }
}
