import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { eventsConfig } from '../config/events.config';
import { EventAuditListener } from './listeners/event-audit.listener';
import { UserListener } from './listeners/user.listener';
import { QuestListener } from './listeners/quest.listener';
import { PayoutListener } from './listeners/payout.listener';
import { SubmissionListener } from './listeners/submission.listener';

@Global()
@Module({
    imports: [
        EventEmitterModule.forRoot(eventsConfig),
    ],
    providers: [
        EventAuditListener,
        UserListener,
        QuestListener,
        PayoutListener,
        SubmissionListener,
    ],
    exports: [EventEmitterModule],
})
export class EventsModule { }
