import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStoreService } from '../event-store/event-store.service';

@Injectable()
export class EventPersistenceListener implements OnModuleInit {
  private readonly logger = new Logger(EventPersistenceListener.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStoreService: EventStoreService,
  ) {}

  onModuleInit() {
    this.eventEmitter.onAny(async (eventName: string | string[], payload: any) => {
      const name = Array.isArray(eventName) ? eventName.join('.') : eventName;

      // Avoid infinite loop if storing an event itself emits an event (though unlikely here)
      if (name === 'event.persisted') return;

      try {
        await this.eventStoreService.storeEvent({
          eventName: name,
          payload,
          timestamp: payload?.timestamp || new Date(),
          metadata: {
            source: 'EventEmitter2.onAny',
            type: payload?.constructor?.name,
          },
        });
        this.logger.debug(`Event persisted: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to persist event ${name}: ${error.message}`);
      }
    });
  }
}
