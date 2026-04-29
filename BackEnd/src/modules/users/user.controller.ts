import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update.dto';
import { UsersService } from './user.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { CursorPaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataExportService: DataExportService,
  ) {}

  // ─── Search ────────────────────────────────────────────────────────────────

  /**
   * GET /users/search
   *
   * Cursor-paginated user search. Supports filtering by username or Stellar
   * address and sorting by xp, level, or createdAt.
   */
  @Get('search')
  @ApiOperation({ summary: 'Search users by username or Stellar address (cursor-paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Matching users returned with pagination metadata',
    schema: {
      example: {
        data: [{ id: 'user_1', username: 'alice', stellarAddress: 'G...' }],
        nextCursor: 'eyJpZCI6InVzZXJfMSIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjNUMTI6MzQ6NTYuMDAwWiJ9',
        hasMore: true,
        total: 320,
      },
    },
  })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    return this.usersService.searchUsers(searchDto);
  }

   * Pass `nextCursor` from the previous response back as `cursor` to advance.
   */
  @Get('leaderboard')
<<<<<<< HEAD
  @ApiOperation({ summary: 'Get user leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved',
    type: LeaderboardResponseDto,
  })
        nextCursor: 'eyJpZCI6InVzZXJfMSIsInhwIjo5ODAwfQ',
        hasMore: true,
      },
    },
  })
  async getLeaderboard(@Query() paginationDto: CursorPaginationDto) {
    // Default leaderboard limit is 50; honour whatever the caller requests.
    const limit = paginationDto.limit ?? 50;
    return this.usersService.getLeaderboard({ ...paginationDto, limit });
>>>>>>> 31d0d67 (feat: implement cursor-based pagination across list endpoints)
  }

  // ─── Single user ───────────────────────────────────────────────────────────

  @Get(':address')
  @ApiOperation({ summary: 'Get user by Stellar address' })
  @ApiParam({ name: 'address', description: 'Stellar address (starts with G)' })
  @ApiResponse({
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByAddress(@Param('address') address: string) {
    return this.usersService.findByAddress(address);
  }

  // ─── User stats ────────────────────────────────────────────────────────────

  @Get(':address/stats')
  @ApiOperation({ summary: 'Get aggregated statistics for a user' })
  @ApiParam({ name: 'address', description: 'Stellar address' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    type: UserStatsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserStats(@Param('address') address: string) {
    return this.usersService.getUserStats(address);
  }

  // ─── User quest history ────────────────────────────────────────────────────

  /**
   * GET /users/:address/quests
   *
   * Previously used offset pagination. Migrated to cursor-based pagination.
   */
  @Get(':address/quests')
  @ApiOperation({ summary: 'Get quest history for a user (cursor-paginated)' })
  @ApiParam({ name: 'address', description: 'Stellar address' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Pagination cursor' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1–100, default 20)' })
  @ApiResponse({ status: 200, description: 'Quest history retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserQuests(
    @Param('address') address: string,
    @Query() paginationDto: CursorPaginationDto,
  ) {
    const limit = paginationDto.limit ?? 20;
    return this.usersService.getUserQuests(address, { ...paginationDto, limit });
  }

  // ─── Profile update ────────────────────────────────────────────────────────

  @Patch('profile')
=======
  @ApiOperation({ summary: 'Update the authenticated user\'s profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: UpdateProfileDto,
  ) {
    if (!user.stellarAddress) {
      throw new BadRequestException('User has no stellar address');
    }
    return this.usersService.updateProfile(user.stellarAddress, updateData);
  }

  // ─── Look-ups ──────────────────────────────────────────────────────────────

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  // ─── Admin: list admins ────────────────────────────────────────────────────

  /**
   * GET /users/admins/list
   *
   * Returns all admin users. This list is typically small so it is returned
   * without pagination, but the service layer should guard against growth.
   */
  @Get('admins/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin users (Admin only)' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Admins retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAdmins(@Query() paginationDto: CursorPaginationDto) {
    return this.usersService.getUsersByRole(Role.ADMIN, paginationDto);
  }

  // ─── Delete account ────────────────────────────────────────────────────────

  @Delete(':address')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user account' })
  @ApiParam({ name: 'address', description: 'Stellar address' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteUser(
    @Param('address') address: string,
    @CurrentUser() requestingUser: User,
  ) {
    await this.usersService.deleteUser(address, requestingUser);
  }
}
