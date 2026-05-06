import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
import { UsersController } from './user.controller';
import { User } from './entities/user.entity';
import { Quest } from '../quests/entities/quest.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { CacheModule } from '../cache/cache.module';
import { UserExperienceListener } from './events/user-experience.listener';
import { DataExport } from './entities/data-export.entity';
import { DataExportService } from './data-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Quest, Submission, Payout, DataExport]),
    CacheModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserExperienceListener, DataExportService],
  exports: [UsersService, DataExportService],
})
export class UsersModule {}
