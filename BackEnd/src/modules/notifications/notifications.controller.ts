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
import { NotificationsService } from './notifications.service';
import { NotificationAnalyticsService } from './notification-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly analyticsService: NotificationAnalyticsService,
  ) {}

  @Get()
  async getNotifications(@Request() req) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Put('preferences')
  async updatePreference(@Request() req, @Body() dto: UpdatePreferenceDto) {
    return this.notificationsService.updatePreference(
      req.user.id,
      dto.type,
      dto.enabledChannels,
      dto.enabled,
    );
  }

  @Get('analytics')
  async getAnalytics(@Request() req) {
    return this.analyticsService.getDeliveryStats(req.user.id);
  }
}
