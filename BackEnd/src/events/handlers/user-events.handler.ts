import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IUserLevelUpEvent, IReputationChangedEvent } from '../interfaces/user-events.interface';
import { EventStoreService } from '../event-store/event-store.service';

@Injectable()
export class UserEventsHandler {
    private readonly logger = new Logger(UserEventsHandler.name);

    constructor(private readonly eventStoreService: EventStoreService) {}

    @OnEvent('user.level-up', { async: true })
    async handleUserLevelUp(event: IUserLevelUpEvent) {
        this.logger.log(`User level up handled: User ${event.userId} to ${event.newLevel}`);
        await this.eventStoreService.saveEvent('user.level-up', event);
    }

    @OnEvent('user.reputation-changed', { async: true })
    async handleReputationChanged(event: IReputationChangedEvent) {
        this.logger.log(`User reputation changed: User ${event.userId} changed by ${event.newReputation - event.oldReputation}`);
        await this.eventStoreService.saveEvent('user.reputation-changed', event);
    }
}
