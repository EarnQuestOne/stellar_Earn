import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventStore } from '../entities/event-store.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IEvent } from '../interfaces/event.interface';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    @InjectRepository(EventStore)
    private readonly eventStoreRepository: Repository<EventStore>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async storeEvent(event: IEvent): Promise<EventStore> {
    this.logger.debug(`Storing event: ${event.eventName}`);
    const eventEntry = this.eventStoreRepository.create({
      eventName: event.eventName,
      payload: event.payload,
      metadata: event.metadata,
      timestamp: event.timestamp || new Date(),
    });

    return await this.eventStoreRepository.save(eventEntry);
  }

  async getEvents(
    options: {
      from?: Date;
      to?: Date;
      eventName?: string;
    } = {},
  ): Promise<EventStore[]> {
    const { from, to, eventName } = options;
    const query: any = {};

    if (from && to) {
      query.timestamp = Between(from, to);
    } else if (from) {
      query.timestamp = Between(from, new Date());
    }

    if (eventName) {
      query.eventName = eventName;
    }

    return await this.eventStoreRepository.find({
      where: query,
      order: { timestamp: 'ASC' },
    });
  }

  async replayEvents(from: Date, to?: Date): Promise<number> {
    const events = await this.getEvents({ from, to });
    this.logger.log(`Replaying ${events.length} events...`);

    for (const event of events) {
      this.logger.debug(`Replaying event: ${event.eventName}`);
      await this.eventEmitter.emitAsync(event.eventName, event.payload);
    }

    return events.length;
  }
}
