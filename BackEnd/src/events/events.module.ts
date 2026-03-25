import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { eventsConfig } from '../config/events.config';
import { EventAuditListener } from './listeners/event-audit.listener';
import { UserListener } from './listeners/user.listener';
import { QuestListener } from './listeners/quest.listener';
import { PayoutListener } from './listeners/payout.listener';
import { SubmissionListener } from './listeners/submission.listener';
import { EventStore } from './entities/event-store.entity';
import { EventStoreService } from './event-store/event-store.service';
import { EventPersistenceListener } from './listeners/event-persistence.listener';
import { DeadLetterQueueListener } from './listeners/dead-letter-queue.listener';
import { JobsModule } from '../modules/jobs/jobs.module';

@Global()
@Module({
    imports: [
        EventEmitterModule.forRoot(eventsConfig),
        TypeOrmModule.forFeature([EventStore]),
        JobsModule,
    ],
    providers: [
        EventStoreService,
        EventPersistenceListener,
        DeadLetterQueueListener,
        EventAuditListener,
        UserListener,
        QuestListener,
        PayoutListener,
        SubmissionListener,
    ],
    exports: [EventEmitterModule, EventStoreService],
})
export class EventsModule { }
