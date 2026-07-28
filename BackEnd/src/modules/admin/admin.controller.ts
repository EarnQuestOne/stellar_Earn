import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { AdminService } from './admin.service';

@UseGuards(IpWhitelistGuard, JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
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

