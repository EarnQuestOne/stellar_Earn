import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionDto,
  DeliveryResponseDto,
  SubscriptionResponseDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhookSubscription } from './entities/webhook-subscription.entity';

/**
 * Admin API for managing outbound event-subscription webhooks.
 *
 * Distinct from the inbound `webhooks` module: this pushes platform domain
 * events to third-party consumers.
 */
@ApiTags('webhooks-outbound')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('webhooks-outbound/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an outbound webhook subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'ADMIN role required' })
  async create(
    @Body() dto: CreateSubscriptionDto,
  ): Promise<WebhookSubscription> {
    return this.subscriptionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List outbound webhook subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'All subscriptions',
    type: SubscriptionResponseDto,
    isArray: true,
  })
  async findAll(): Promise<WebhookSubscription[]> {
    return this.subscriptionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by id' })
  @ApiResponse({
    status: 200,
    description: 'The subscription',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async findOne(@Param('id') id: string): Promise<WebhookSubscription> {
    return this.subscriptionsService.findOne(id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List deliveries for a subscription' })
  @ApiResponse({
    status: 200,
    description: 'Recent deliveries (newest first)',
    type: DeliveryResponseDto,
    isArray: true,
  })
  async findDeliveries(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<WebhookDelivery[]> {
    return this.subscriptionsService.findDeliveries(
      id,
      limit ? Number.parseInt(limit, 10) : 50,
    );
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a test delivery to the subscription target' })
  @ApiResponse({
    status: 201,
    description: 'Test delivery created',
    type: DeliveryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async sendTestEvent(@Param('id') id: string): Promise<WebhookDelivery> {
    return this.subscriptionsService.sendTestEvent(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a subscription (rename, retarget, rotate secret, pause)',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated subscription',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<WebhookSubscription> {
    return this.subscriptionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a subscription (cancels pending deliveries)',
  })
  @ApiResponse({ status: 204, description: 'Subscription deleted' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.subscriptionsService.remove(id);
  }
}
