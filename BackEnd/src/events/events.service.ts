import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStoreService } from './event-store/event-store.service';
import { AppLoggerService } from '../common/logger/logger.service';

export interface EventMetadata {
  correlationId?: string;
  userId?: string;
  timestamp?: Date;
  retriedFrom?: string;
  [key: string]: any;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly eventStore: EventStoreService,
  ) {}

  async emit(
    type: string,
    payload: any,
    metadata?: EventMetadata,
  ): Promise<void> {
    // Automatically include correlation ID from logger context if not provided
    const requestContext = AppLoggerService.getRequestContext();
    const correlationId = metadata?.correlationId || requestContext?.correlationId;

    const enhancedMetadata: EventMetadata = {
      ...metadata,
      correlationId,
    };

    // If payload is a BaseEvent, set correlationId on it
    if (payload && typeof payload === 'object' && 'correlationId' in payload === false) {
      Object.defineProperty(payload, 'correlationId', {
        value: correlationId,
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }

    // Emit the event
    this.eventEmitter.emit(type, payload);

    // Store the event in database
    await this.eventStore.saveEvent(type, payload, enhancedMetadata);
  }
}
