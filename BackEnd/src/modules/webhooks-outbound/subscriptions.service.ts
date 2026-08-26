import {
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookSubscription,
  WebhookSubscriptionStatus,
} from './entities/webhook-subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { encryptSecret, generateSecret } from './webhook-crypto';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

/** A subscription plus its plaintext secret, returned exactly once on create/rotate. */
export interface SubscriptionWithSecret {
  subscription: WebhookSubscription;
  secret: string;
}

/**
 * CRUD and lifecycle management for outbound webhook subscriptions.
 *
 * The signing secret is never persisted or returned in plaintext except in the
 * one-time response of create/rotate; at rest it is AES-256-GCM encrypted.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptions: Repository<WebhookSubscription>,
    @Inject(forwardRef(() => WebhookDispatcherService))
    private readonly dispatcher: WebhookDispatcherService,
  ) {}

  async create(dto: CreateSubscriptionDto): Promise<SubscriptionWithSecret> {
    const secret = dto.secret ?? generateSecret();
    const entity = this.subscriptions.create({
      name: dto.name ?? null,
      targetUrl: dto.targetUrl,
      eventTypes: dto.eventTypes,
      encryptedSecret: encryptSecret(secret),
      status: WebhookSubscriptionStatus.ACTIVE,
    });
    const saved = await this.subscriptions.save(entity);
    this.logger.log(
      `Created webhook subscription ${saved.id} for ${saved.targetUrl}`,
    );
    return { subscription: saved, secret };
  }

  findAll(): Promise<WebhookSubscription[]> {
    return this.subscriptions.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<WebhookSubscription> {
    const sub = await this.subscriptions.findOne({ where: { id } });
    if (!sub) {
      throw new NotFoundException(`Webhook subscription ${id} not found`);
    }
    return sub;
  }

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<WebhookSubscription> {
    const sub = await this.findOne(id);
    if (dto.name !== undefined) sub.name = dto.name;
    if (dto.targetUrl !== undefined) sub.targetUrl = dto.targetUrl;
    if (dto.eventTypes !== undefined) sub.eventTypes = dto.eventTypes;
    if (dto.status !== undefined) sub.status = dto.status;
    return this.subscriptions.save(sub);
  }

  async remove(id: string): Promise<void> {
    const result = await this.subscriptions.delete({ id });
    if (!result.affected) {
      throw new NotFoundException(`Webhook subscription ${id} not found`);
    }
  }

  /** Rotates the signing secret, returning the new plaintext once. */
  async rotateSecret(id: string): Promise<SubscriptionWithSecret> {
    const sub = await this.findOne(id);
    const secret = generateSecret();
    sub.encryptedSecret = encryptSecret(secret);
    const saved = await this.subscriptions.save(sub);
    this.logger.log(`Rotated signing secret for webhook subscription ${id}`);
    return { subscription: saved, secret };
  }

  /** Sends a signed `webhook.test` event to the subscription to verify wiring. */
  async sendTestEvent(id: string): Promise<{ deliveryId: string }> {
    const sub = await this.findOne(id);
    const delivery = await this.dispatcher.dispatchToSubscription(
      sub,
      'webhook.test',
      {
        message:
          'This is a test event from the platform outbound webhook system.',
        subscriptionId: sub.id,
      },
    );
    return { deliveryId: delivery.id };
  }
}
