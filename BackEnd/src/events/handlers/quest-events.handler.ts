import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IQuestCreatedEvent, IQuestUpdatedEvent } from '../interfaces/quest-events.interface';
import { EventStoreService } from '../event-store/event-store.service';

@Injectable()
export class QuestEventsHandler {
    private readonly logger = new Logger(QuestEventsHandler.name);

    constructor(private readonly eventStoreService: EventStoreService) {}

    @OnEvent('quest.created', { async: true })
    async handleQuestCreated(event: IQuestCreatedEvent) {
        this.logger.log(`Quest created event handled: ${event.questId}`);
        await this.eventStoreService.saveEvent('quest.created', event);
    }

    @OnEvent('quest.updated', { async: true })
    async handleQuestUpdated(event: IQuestUpdatedEvent) {
        this.logger.log(`Quest updated event handled: ${event.questId}`);
        await this.eventStoreService.saveEvent('quest.updated', event);
    }
}
