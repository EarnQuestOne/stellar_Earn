import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserExperienceListener } from './events/user-experience.listener';
import { DataExportService } from './data-export.service';
import { DataExport } from './entities/data-export.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DataExport]),
    EventEmitterModule,
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, DataExportService, UserExperienceListener],
  exports: [UsersService, DataExportService],
})
export class UsersModule {}
