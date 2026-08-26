import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { WebhookSubscription } from './entities/webhook-subscription.entity';

/**
 * Admin-guarded management API for outbound webhook subscriptions.
 *
 * The plaintext signing secret is only ever returned by `create` and
 * `rotate-secret`; every other response omits it.
 */
@ApiTags('Outbound Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('webhooks-outbound/subscriptions')
@ApiResponse({ status: 401, description: 'Authentication required' })
@ApiResponse({ status: 403, description: 'Admin role required' })
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a subscription (returns the signing secret once)',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created; secret returned once',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(@Body() dto: CreateSubscriptionDto) {
    const { subscription, secret } = await this.subscriptions.create(dto);
    return { ...this.serialize(subscription), secret };
  }

  @Get()
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'Array of subscriptions (secrets omitted)',
  })
  async findAll() {
    return (await this.subscriptions.findAll()).map((s) => this.serialize(s));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID' })
  @ApiResponse({
    status: 200,
    description: 'The subscription (secret omitted)',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serialize(await this.subscriptions.findOne(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a subscription (URL, events, or active/paused state)',
  })
  @ApiResponse({ status: 200, description: 'Subscription updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.serialize(await this.subscriptions.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiResponse({ status: 204, description: 'Subscription deleted' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.subscriptions.remove(id);
  }

  @Post(':id/rotate-secret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the signing secret (returns the new secret once)',
  })
  @ApiResponse({
    status: 200,
    description: 'Secret rotated; new secret returned once',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async rotate(@Param('id', ParseUUIDPipe) id: string) {
    const { subscription, secret } = await this.subscriptions.rotateSecret(id);
    return { ...this.serialize(subscription), secret };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a signed test event to the subscription' })
  @ApiResponse({ status: 202, description: 'Test delivery enqueued' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async test(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptions.sendTestEvent(id);
  }

  /** Strips the encrypted secret from API responses. */
  private serialize(sub: WebhookSubscription) {
    const { encryptedSecret: _encryptedSecret, ...safe } = sub;
    void _encryptedSecret;
    return safe;
  }
}
