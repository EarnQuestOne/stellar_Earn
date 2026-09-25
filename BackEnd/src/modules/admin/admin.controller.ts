import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';
import { AdminService } from './admin.service';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(IpWhitelistGuard, JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Get paginated list of users',
    description:
      'Retrieve a paginated list of registered users. Requires admin role and IP whitelist clearance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list successfully retrieved.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid pagination query parameters.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role and whitelisted IP address.',
  })
  getUsers(@Query() query: GetUsersQueryDto = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.adminService.getUsers(page, limit);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve full user profile and metadata by UUID. Requires admin role and IP whitelist clearance.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User UUID identifier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: 200,
    description: 'User details successfully retrieved.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role and whitelisted IP address.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found for the given ID.',
  })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get platform administration statistics',
    description:
      'Retrieve high-level platform statistics including total users and admin count (cached for 5 minutes).',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform statistics successfully retrieved.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Bearer token missing or invalid.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role and whitelisted IP address.',
  })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }
}
