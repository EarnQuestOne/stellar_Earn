import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobLogService } from './services/job-log.service';
import { JobSchedulerService } from './services/job-scheduler.service';
import { PayoutProcessor } from './processors/payout.processor';
import { EmailProcessor } from './processors/email.processor';
import { DataExportProcessor } from './processors/export.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { WebhookProcessor } from './processors/webhook.processor';
import { AnalyticsProcessor } from './processors/analytics.processor';
import { QuestProcessor } from './processors/quest.processor';
import { JobLog, JobLogRetry, JobDependency, JobSchedule } from './entities/job-log.entity';
import { DataExport } from '../users/entities/data-export.entity';
import { DataExportListener } from './listeners/data-export.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobLog, JobLogRetry, JobDependency, JobSchedule, DataExport]),
  ],
  providers: [
    JobsService,
    JobLogService,
    JobSchedulerService,
    PayoutProcessor,
    EmailProcessor,
    DataExportProcessor,
    CleanupProcessor,
    WebhookProcessor,
    AnalyticsProcessor,
    QuestProcessor,
    DataExportListener,
  ],
  controllers: [JobsController],
  exports: [
    JobsService,
    JobLogService,
    JobSchedulerService,
    PayoutProcessor,
    EmailProcessor,
    DataExportProcessor,
    CleanupProcessor,
    WebhookProcessor,
    AnalyticsProcessor,
    QuestProcessor,
  ],
})
export class JobsModule {}
