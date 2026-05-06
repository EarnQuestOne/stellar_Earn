import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
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
/**
 * NotificationsController
 *
 * All list endpoints use cursor-based pagination via NotificationQueryDto
 * (which extends CursorPaginationDto). Pass `nextCursor` from any paginated
 * response back as `cursor` in the next request to advance through results.
 */
@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── List notifications ─────────────────────────────────────────────────────

  /**
   * GET /notifications
   *
   * Returns cursor-paginated notifications for the authenticated user,
   * newest first. Optionally filter by read/unread status.
   */
  @Get()
  @ApiOperation({ summary: 'Get notifications for the current user (cursor-paginated)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Pagination cursor from previous response' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1–100, default 20)' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Return only unread notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications returned with pagination metadata',
    schema: {
      example: {
        data: [
          {
            id: 'notif_abc',
            type: 'QUEST_APPROVED',
            title: 'Quest approved',
            body: 'Your submission for "Complete KYC" was approved.',
            read: false,
            createdAt: '2026-01-24T09:00:00.000Z',
          },
        ],
        nextCursor: 'eyJpZCI6Im5vdGlmX2FiYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjRUMDk6MDA6MDAuMDAwWiJ9',
        hasMore: true,
        total: 54,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Query() queryDto: NotificationQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.findByUser(user.id, queryDto);
  }

  // ─── Unread count ───────────────────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Unread count returned',
    schema: { example: { unreadCount: 7 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  // ─── Mark one as read ───────────────────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  // ─── Mark all as read ───────────────────────────────────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ─── Delete one ─────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.notificationsService.deleteNotification(id, user.id);
  }
}

