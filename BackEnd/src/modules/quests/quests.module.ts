import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { Quest } from './entities/quest.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Quest])],
    controllers: [QuestsController],
    providers: [QuestsService],
    exports: [QuestsService],
})
export class QuestsModule { }
