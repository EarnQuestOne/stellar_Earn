import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { StellarModule } from '../stellar/stellar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Quest } from '../quests/entities/quest.entity';
import { User } from '../users/entities/user.entity';
import { VerifierGuard } from '../auth/guards/verifier.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Quest, User]),
    StellarModule,
    NotificationsModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, VerifierGuard],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
