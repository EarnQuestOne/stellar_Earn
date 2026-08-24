import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { AdminService } from './admin.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@UseGuards(IpWhitelistGuard, JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query() query: GetUsersQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.adminService.getUsers(page, limit);
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
