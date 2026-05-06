import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';
import { AuditLogService } from './services/audit-log.service';
import { RetryService } from './services/retry.service';
import { EventStoreService } from './event-store/event-store.service';
import { EventStore } from './entities/event-store.entity';
import { QuestEventsHandler } from './handlers/quest-events.handler';
import { SubmissionEventsHandler } from './handlers/submission-events.handler';
import { UserEventsHandler } from './handlers/user-events.handler';
import { DeadLetterHandler } from './handlers/dead-letter.handler';
import { EventAuditListener } from './listeners/event-audit.listener';
import { EventPersistenceListener } from './listeners/event-persistence.listener';
import { DeadLetterQueueListener } from './listeners/dead-letter-queue.listener';
import { UserListener } from './listeners/user.listener';
import { QuestListener } from './listeners/quest.listener';
import { SubmissionListener } from './listeners/submission.listener';
import { PayoutListener } from './listeners/payout.listener';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    TypeOrmModule.forFeature([EventStore]),
  ],
  providers: [
    EventsService,
    EventStoreService,
    AuditLogService,
    RetryService,
    // Event Handlers
    QuestEventsHandler,
    SubmissionEventsHandler,
    UserEventsHandler,
    DeadLetterHandler,
    // Event Listeners
    EventAuditListener,
    EventPersistenceListener,
    DeadLetterQueueListener,
    UserListener,
    QuestListener,
    SubmissionListener,
    PayoutListener,
  ],
  exports: [EventsService, EventStoreService],
})
export class EventsModule {}