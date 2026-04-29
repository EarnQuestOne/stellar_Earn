import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import {
  NotificationListResponseDto,
  MarkAsReadResponseDto,
  MarkAllAsReadResponseDto,
  UpdatePreferenceResponseDto,
  NotificationAnalyticsResponseDto,
} from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly analyticsService: NotificationAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved',
    type: NotificationListResponseDto,
  })
  async getNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: MarkAsReadResponseDto,
  })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkAllAsReadResponseDto,
  })
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Preferences updated',
    type: UpdatePreferenceResponseDto,
  })
  async updatePreference(@Request() req, @Body() dto: UpdatePreferenceDto) {
    return this.notificationsService.updatePreference(
      req.user.id,
      dto.type,
      dto.enabledChannels,
      dto.enabled,
    );
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get notification analytics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved',
    type: NotificationAnalyticsResponseDto,
  })
  async getAnalytics(@Request() req) {
    return this.analyticsService.getDeliveryStats(req.user.id);
  }
}
