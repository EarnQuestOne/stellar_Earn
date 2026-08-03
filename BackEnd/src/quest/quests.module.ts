// src/modules/quest/quests.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { Quest } from './entities/quest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quest])],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService], // Ensures other modules (like cache/events) can inject it
})
export class QuestsModule {}