import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobLogService } from './services/job-log.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { PayoutProcessor } from './processors/payout.processor';
import { PayoutReconciliationProcessor } from './processors/payout-reconciliation.processor';
import { EmailProcessor } from './processors/email.processor';
import { DataExportProcessor } from './processors/export.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { QuestProcessor } from './processors/quest.processor';
import { QuestStateReconciliationProcessor } from './processors/quest-state-reconciliation.processor';
import { DependencyProcessor } from './processors/dependency.processor';
import { DeadLetterProcessor } from './processors/dead-letter.processor';
import {
  JobLog,
  JobLogRetry,
  JobDependency,
  JobSchedule,
} from './entities/job-log.entity';
import { DataExport } from '../users/entities/data-export.entity';
import { DataExportListener } from './listeners/data-export.listener';
import { Payout } from '../payouts/entities/payout.entity';
import { Quest } from '../quests/entities/quest.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { StellarModule } from '../stellar/stellar.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DependencyFreshnessService } from '../../common/services/dependency-freshness.service';
import { EventStore } from '../../events/entities/event-store.entity';
import { PoisonMessage } from '../../events/entities/poison-message.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { PoisonMessageService } from '../../events/services/poison-message.service';
import { DlqAlertService } from '../../events/services/dlq-alert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobLog,
      JobLogRetry,
      JobDependency,
      JobSchedule,
      DataExport,
      Payout,
      Quest,
      Submission,
      EventStore,
      PoisonMessage,
      User,
    ]),
    EventEmitterModule,
    StellarModule,
    AnalyticsModule,
    forwardRef(() => EmailModule),
  ],
  providers: [
    JobsService,
    JobLogService,
    JobSchedulerService,
    PayoutProcessor,
    PayoutReconciliationProcessor,
    EmailProcessor,
    DataExportProcessor,
    CleanupProcessor,
    WebhookProcessor,
    AnalyticsProcessor,
    QuestProcessor,
    QuestStateReconciliationProcessor,
    DependencyProcessor,
    DeadLetterProcessor,
    PoisonMessageService,
    DlqAlertService,
    DataExportListener,
    DependencyFreshnessService,
  ],
  controllers: [JobsController],
  exports: [
    JobsService,
    JobLogService,
    JobSchedulerService,
    PayoutProcessor,
    PayoutReconciliationProcessor,
    EmailProcessor,
    DataExportProcessor,
    CleanupProcessor,
    WebhookProcessor,
    AnalyticsProcessor,
    QuestProcessor,
    QuestStateReconciliationProcessor,
    DependencyProcessor,
    DeadLetterProcessor,
    PoisonMessageService,
    DlqAlertService,
    DependencyFreshnessService,
  ],
})
export class JobsModule {}
