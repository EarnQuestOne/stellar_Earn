import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { Quest } from './entities/quest.entity';
import { CacheModule } from '../cache/cache.module';
import { QuestNotificationsListener } from './events/quest-notifications.listener';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quest]), CacheModule, ModerationModule],
  controllers: [QuestsController],
  providers: [QuestsService, QuestNotificationsListener],
  exports: [QuestsService],
})
export class QuestsModule {}
