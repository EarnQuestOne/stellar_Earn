import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PoisonMessageService } from '../services/poison-message.service';

@Injectable()
export class PoisonMessageHandler {
  private readonly logger = new Logger(PoisonMessageHandler.name);

  constructor(private readonly poisonMessageService: PoisonMessageService) {}

  @OnEvent('event.failed', { async: true })
  async handleFailedEvent(payload: {
    eventName?: string;
    type?: string;
    eventId?: string;
    payload?: any;
    data?: any;
    error: string;
    metadata?: any;
  }): Promise<void> {
    const eventName = payload.eventName || payload.type || 'unknown';
    const eventPayload = payload.payload || payload.data;

    this.logger.warn(`Handling poison message for event: ${eventName}`);

    await this.poisonMessageService.quarantine(
      eventName,
      eventPayload,
      payload.error,
      payload.metadata,
    );
  }
}
