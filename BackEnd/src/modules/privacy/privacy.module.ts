import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ErasureRequest } from './entities/erasure-request.entity';
import { ErasureService } from './erasure.service';
import { ErasureController } from './erasure.controller';
import { User } from '../users/entities/user.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ModerationItem } from '../moderation/entities/moderation-item.entity';
import { EventStore } from '../../events/entities/event-store.entity';
import { UsersModule } from '../users/users.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ErasureRequest,
      User,
      Submission,
      Payout,
      Notification,
      ModerationItem,
      EventStore,
    ]),
    EventEmitterModule,
    // forwardRef breaks the JS import cycle PrivacyModule → UsersModule →
    // EmailModule → JobsModule → (forwardRef) PrivacyModule; SubmissionsModule
    // is wrapped for the same reason (it is imported from the same module file
    // during circular evaluation).
    forwardRef(() => UsersModule),
    forwardRef(() => SubmissionsModule),
  ],
  controllers: [ErasureController],
  providers: [ErasureService],
  exports: [ErasureService],
})
export class PrivacyModule {}
