import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { QuestCreatedEvent } from '../dto/quest-created.event';
import { QuestCompletedEvent } from '../dto/quest-completed.event';
import { QuestDeletedEvent } from '../dto/quest-deleted.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class QuestListener {
    private readonly logger = new Logger(QuestListener.name);

    constructor(private readonly eventEmitter: EventEmitter2) {}

    @OnEvent('quest.created', { async: true })
    @Retry(3, 1000)
    async handleQuestCreatedEvent(event: QuestCreatedEvent) {
        this.logger.log(`Handling quest.created for quest: ${event.title} (${event.questId})`);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            this.logger.log(`Successfully processed quest.created notification for ${event.questId}`);
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'quest.created', payload: event, error: error.message });
            throw error;
        }
    }

    @OnEvent('quest.completed', { async: true })
    @Retry(3, 1000)
    async handleQuestCompletedEvent(event: QuestCompletedEvent) {
        this.logger.log(`Handling quest.completed for quest: ${event.questId}, user: ${event.userId}`);
        try {
          // Process completion
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'quest.completed', payload: event, error: error.message });
            throw error;
        }
    }

    @OnEvent('quest.deleted', { async: true })
    @Retry(3, 1000)
    async handleQuestDeletedEvent(event: QuestDeletedEvent) {
        this.logger.log(`Handling quest.deleted for quest: ${event.questId}`);
        try {
          // Process deletion
        } catch (error) {
            this.eventEmitter.emit('event.failed', { eventName: 'quest.deleted', payload: event, error: error.message });
            throw error;
        }
    }
}
