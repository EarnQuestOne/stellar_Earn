import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUsers(page: number, limit: number) {
    const [users, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { users, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    return user;
  }

  async getPlatformStats() {
    const totalUsers = await this.userRepo.count();
    const adminCount = await this.userRepo.count({
      where: { role: Role.ADMIN },
    });
    return { totalUsers, adminCount };
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@UseGuards(IpWhitelistGuard, JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getUsers(Number(page), Number(limit));
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigModule],
  controllers: [AdminController],
  providers: [AdminService, IpWhitelistGuard],
  exports: [AdminService],
})
export class AdminModule {}
