import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventStoreService } from './event-store/event-store.service';

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

  async emit(type: string, payload: any, metadata?: EventMetadata): Promise<void> {
    // Emit the event
    this.eventEmitter.emit(type, payload);
    
    // Store the event in database
    await this.eventStore.saveEvent(type, payload, metadata);
  }
}
