import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
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
import { User, UserRole } from './entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or address' })
  @ApiQuery({ name: 'query', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['xp', 'level', 'createdAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Users found' })
  async searchUsers(@Query() searchDto: SearchUsersDto) {
    return this.usersService.searchUsers(searchDto);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get user leaderboard' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getLeaderboard(page, limit);
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get user by Stellar address' })
  @ApiParam({ name: 'address', description: 'Stellar address (starts with G)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByAddress(@Param('address') address: string) {
    return this.usersService.findByAddress(address);
  }

  @Get(':address/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiParam({ name: 'address', description: 'Stellar address' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserStats(@Param('address') address: string) {
    return this.usersService.getUserStats(address);
  }

  @Get(':address/quests')
  @ApiOperation({ summary: 'Get user quest history' })
  @ApiParam({ name: 'address', description: 'Stellar address' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Quest history retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserQuests(
    @Param('address') address: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getUserQuests(address, page, limit);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
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

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({ name: 'username', description: 'Username' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get('admins/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admin users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admins retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAdmins() {
    return this.usersService.getUsersByRole(UserRole.ADMIN);
  }

  @Delete(':address')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account' })
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
