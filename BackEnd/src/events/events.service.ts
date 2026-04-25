import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface EventMetadata {
  correlationId?: string;
  userId?: string;
  timestamp?: Date;
  retriedFrom?: string;
  [key: string]: any;
}

export interface StoredEvent {
  id: string;
  type: string;
  payload: any;
  metadata: EventMetadata;
  createdAt: Date;
  retryCount: number;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private events: StoredEvent[] = [];
  private failedEvents: StoredEvent[] = [];

  async saveEvent(type: string, payload: any, metadata?: EventMetadata): Promise<string> {
    const event: StoredEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      payload,
      metadata: metadata || {},
      createdAt: new Date(),
      retryCount: 0,
    };
    this.events.push(event);
    return event.id;
  }

  async markAsFailed(eventId: string, error: string): Promise<void> {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.retryCount += 1;
      if (!this.failedEvents.find(e => e.id === eventId)) {
        this.failedEvents.push(event);
      }
    }
  }

  async getFailedEvents(): Promise<StoredEvent[]> {
    return this.failedEvents;
  }
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventStore: EventStoreService) {}

  async emit(type: string, payload: any, metadata?: EventMetadata): Promise<void> {
    await this.eventStore.saveEvent(type, payload, metadata);
  }
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async logAudit(metadata: {
    userId?: string;
    action: string;
    resource: string;
    details?: any;
  }): Promise<void> {
    this.logger.log(`AUDIT: ${metadata.action} on ${metadata.resource} by ${metadata.userId || 'anonymous'}`);
  }
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async scheduleRetry(operation: () => Promise<any>, maxAttempts: number = 3): Promise<any> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
