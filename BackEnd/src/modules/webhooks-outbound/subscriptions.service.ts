import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import {
  WebhookDelivery,
  WebhookDeliveryStatus,
} from './entities/webhook-delivery.entity';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { encryptSecret } from './utils/secret-encryption';

/**
 * Manages third-party subscriptions to platform domain events.
 *
 * Signing secrets are generated when the caller does not supply one, stored
 * AES-256-GCM encrypted, and never returned by any read endpoint.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDelivery)
    private readonly deliveries: Repository<WebhookDelivery>,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<WebhookSubscription> {
    const secret = dto.secret ?? this.generateSecret();
    const subscription = this.subscriptions.create({
      name: dto.name ?? null,
      eventType: dto.eventType,
      targetUrl: dto.targetUrl,
      secretEncrypted: encryptSecret(secret),
      isActive: true,
    });
    const saved = await this.subscriptions.save(subscription);
    this.logger.log(
      `Created outbound webhook subscription ${saved.id} for ${saved.eventType}`,
    );
    return saved;
  }

  async findAll(): Promise<WebhookSubscription[]> {
    return this.subscriptions.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<WebhookSubscription> {
    const subscription = await this.subscriptions.findOne({ where: { id } });
    if (!subscription) {
      throw new NotFoundException(`Webhook subscription ${id} not found`);
    }
    return subscription;
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<WebhookSubscription> {
    const subscription = await this.findOne(id);
    if (dto.name !== undefined) subscription.name = dto.name;
    if (dto.targetUrl !== undefined) subscription.targetUrl = dto.targetUrl;
    if (dto.isActive !== undefined) subscription.isActive = dto.isActive;
    if (dto.secret !== undefined) {
      subscription.secretEncrypted = encryptSecret(dto.secret);
    }
    const saved = await this.subscriptions.save(subscription);
    this.logger.log(`Updated outbound webhook subscription ${saved.id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const subscription = await this.findOne(id);
    // Short-circuit any pending deliveries for a deleted subscription.
    await this.deliveries.update(
      { subscriptionId: id, status: WebhookDeliveryStatus.PENDING },
      { status: WebhookDeliveryStatus.CANCELLED },
    );
    await this.subscriptions.remove(subscription);
    this.logger.log(`Deleted outbound webhook subscription ${id}`);
  }

  /**
   * Sends a test delivery to the subscription target. Returns the delivery
   * row so callers can inspect the attempt outcome.
   */
  async sendTestEvent(id: string): Promise<WebhookDelivery> {
    const subscription = await this.findOne(id);
    const eventId = `test:${crypto.randomUUID()}`;
    const payload = {
      id: eventId,
      type: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test delivery from the platform.' },
    };
    const delivery = this.deliveries.create({
      subscriptionId: subscription.id,
      eventType: subscription.eventType,
      eventId,
      payload,
      status: WebhookDeliveryStatus.PENDING,
      maxAttempts: 1,
    });
    return this.deliveries.save(delivery);
  }

  async findDeliveries(
    subscriptionId: string,
    limit = 50,
  ): Promise<WebhookDelivery[]> {
    return this.deliveries.find({
      where: { subscriptionId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
