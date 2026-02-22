import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { QuestCreatedEvent } from '../dto/quest-created.event';
import { QuestCompletedEvent } from '../dto/quest-completed.event';
import { QuestDeletedEvent } from '../dto/quest-deleted.event';
import { Retry } from '../../common/decorators/retry.decorator';

@Injectable()
export class QuestListener {
    private readonly logger = new Logger(QuestListener.name);

    @OnEvent('quest.created', { async: true })
    @Retry(3, 1000)
    async handleQuestCreatedEvent(event: QuestCreatedEvent) {
        this.logger.log(`Handling quest.created for quest: ${event.title} (${event.questId})`);
        // Simulate some async processing like notifying potential participants
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.logger.log(`Successfully processed quest.created notification for ${event.questId}`);
    }

    @OnEvent('quest.completed', { async: true })
    @Retry(3, 1000)
    async handleQuestCompletedEvent(event: QuestCompletedEvent) {
        this.logger.log(`Handling quest.completed for quest: ${event.questId}, user: ${event.userId}`);
    }

    @OnEvent('quest.deleted', { async: true })
    @Retry(3, 1000)
    async handleQuestDeletedEvent(event: QuestDeletedEvent) {
        this.logger.log(`Handling quest.deleted for quest: ${event.questId}`);
    }
}
