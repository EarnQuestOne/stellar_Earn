import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from '../notifications/notifications.module';
import { StellarModule } from '../stellar/stellar.module';

import { CacheModule } from '../cache/cache.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { SubmissionAggregatesService } from './submission-aggregates.service';
import { Submission } from './entities/submission.entity';
import { VerificationDedupService } from '../../common/services/verification-dedup.service';
import { Quest } from '../quests/entities/quest.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Quest, User]),
    EventEmitterModule,
    NotificationsModule,
    StellarModule,
    CacheModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionAggregatesService, VerificationDedupService],
  exports: [SubmissionsService, SubmissionAggregatesService],

})
export class SubmissionsModule {}
