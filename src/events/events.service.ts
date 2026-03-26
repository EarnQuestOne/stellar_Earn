import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditLogService } from './services/audit-log.service';
import { RetryService } from './services/retry.service';

@Injectable()
export class EventsService {
  constructor(
    private eventEmitter: EventEmitter2,
    private auditLogService: AuditLogService,
    private retryService: RetryService,
  ) {}

  async emit(event: string, payload: any): Promise<void> {
    const eventData = {
      ...payload,
      emittedAt: new Date(),
      eventId: this.generateEventId(),
    };

    await this.auditLogService.log(event, eventData);

    await this.retryService.retry(async () => {
      this.eventEmitter.emit(event, eventData);
    }, {
      attempts: 3,
      delay: 1000,
    });
  }

  async emitAsync(event: string, payload: any): Promise<void> {
    setImmediate(async () => {
      await this.emit(event, payload);
    });
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}