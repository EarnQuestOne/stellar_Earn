import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, IpWhitelistGuard],
  exports: [AdminService],
})
export class AdminModule {}
