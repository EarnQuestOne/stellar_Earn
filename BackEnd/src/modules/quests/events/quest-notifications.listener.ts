import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IQuestCreatedEvent } from '../../../events/interfaces/quest-events.interface';

@Injectable()
export class QuestNotificationsListener {
    private readonly logger = new Logger(QuestNotificationsListener.name);

    @OnEvent('quest.created', { async: true })
    async handleQuestCreated(event: IQuestCreatedEvent) {
        this.logger.log(`[QuestModule] Sending notification for quest: ${event.title}`);
        // Logic to notify potential participants (e.g., via email or internal notification service)
    }
}
