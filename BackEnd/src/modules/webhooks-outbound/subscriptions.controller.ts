import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
  SendTestEventDto,
} from './dto/webhook-subscription.dto';

/**
 * Admin-managed CRUD for outbound event subscriptions (#2306).
 * Third-party consumers receive the deliveries; only platform admins
 * manage the subscriptions themselves.
 */
@ApiTags('webhooks-outbound')
@ApiBearerAuth()
@Controller('webhooks/outbound/subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create an outbound webhook subscription' })
  @ApiResponse({
    status: 201,
    description:
      'Subscription created. The response contains the signing secret in plaintext — it is not recoverable later.',
  })
  async create(@Body() dto: CreateWebhookSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all outbound webhook subscriptions' })
  async list() {
    return this.subscriptionsService.list();
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiOperation({ summary: 'Get one outbound webhook subscription' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiOperation({ summary: 'Update label / target URL / events / state' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    const updated = await this.subscriptionsService.update(id, dto);
    if (dto.state === 'paused') {
      await this.dispatcher.skipDeliveriesForSubscription(id);
    }
    return updated;
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a subscription (pending deliveries are skipped)',
  })
  async remove(@Param('id') id: string) {
    await this.dispatcher.skipDeliveriesForSubscription(id);
    return this.subscriptionsService.remove(id);
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiOperation({
    summary: 'Rotate the signing secret',
    description:
      'Generates a new secret and returns it once. Consumers must update their verifier.',
  })
  async rotateSecret(@Param('id') id: string) {
    return this.subscriptionsService.rotateSecret(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiOperation({
    summary: 'Send a test event to the subscription target URL',
  })
  async sendTestEvent(@Param('id') id: string, @Body() dto: SendTestEventDto) {
    const subscription = await this.subscriptionsService.findOne(id);
    const eventType = dto.eventType ?? subscription.eventTypes[0] ?? 'test';
    const { deliveryIds } = await this.dispatcher.dispatchDomainEvent(
      eventType,
      {
        message: 'This is a test event from StellarEarn.',
        subscriptionId: subscription.id,
        sentAt: new Date().toISOString(),
      },
    );
    this.logger.log(
      `Test event (${eventType}) dispatched for subscription ${id}: ${deliveryIds.length} delivery(ies)`,
    );
    return { accepted: true, eventType, deliveryIds };
  }
}
