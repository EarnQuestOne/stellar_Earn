import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  WebhookSubscription,
  WebhookSubscriptionState,
} from './entities/webhook-subscription.entity';
import {
  CreateWebhookSubscriptionDto,
  UpdateWebhookSubscriptionDto,
} from './dto/webhook-subscription.dto';
import {
  decryptSecret,
  encryptSecret,
  generateWebhookSigningSecret,
} from './utils/signature.util';

/** Never log or return the plaintext secret after creation/rotation. */
export interface WebhookSubscriptionSecretView {
  id: string;
  label: string;
  targetUrl: string;
  eventTypes: string[];
  state: WebhookSubscriptionState;
  secretHint: string;
  createdAt: Date;
  updatedAt: Date;
  /** Plaintext secret — ONLY present on create/rotate responses. */
  secret?: string;
}

/**
 * CRUD + secret lifecycle for outbound webhook subscriptions (#2306).
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    private readonly configService: ConfigService,
  ) {}

  private get encryptionKey(): string {
    const key = this.configService.get<string>(
      'OUTBOUND_WEBHOOK_ENCRYPTION_KEY',
    );
    if (!key) {
      throw new Error(
        'OUTBOUND_WEBHOOK_ENCRYPTION_KEY is not configured — cannot store webhook signing secrets',
      );
    }
    return key;
  }

  private toView(
    entity: WebhookSubscription,
    withSecret?: string,
  ): WebhookSubscriptionSecretView {
    return {
      id: entity.id,
      label: entity.label,
      targetUrl: entity.targetUrl,
      eventTypes: [...entity.eventTypes],
      state: entity.state,
      secretHint: entity.secretHint,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      ...(withSecret !== undefined ? { secret: withSecret } : {}),
    };
  }

  async create(
    dto: CreateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionSecretView> {
    const secret = generateWebhookSigningSecret();
    const entity = await this.subscriptionRepository.save({
      label: dto.label,
      targetUrl: dto.targetUrl,
      eventTypes: dto.eventTypes,
      secretCiphertext: encryptSecret(secret, this.encryptionKey),
      secretHint: secret.slice(-4),
      state: WebhookSubscriptionState.ACTIVE,
    });
    this.logger.log(
      `Created outbound webhook subscription ${entity.id} (${dto.label}) for events [${dto.eventTypes.join(', ')}]`,
    );
    return this.toView(entity, secret);
  }

  async list(): Promise<WebhookSubscriptionSecretView[]> {
    const rows = await this.subscriptionRepository.find({
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => this.toView(row));
  }

  async findOne(id: string): Promise<WebhookSubscriptionSecretView> {
    const row = await this.subscriptionRepository.findOne({ where: { id } });
    if (!row) throw new Error(`Webhook subscription ${id} not found`);
    return this.toView(row);
  }

  async update(
    id: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookSubscriptionSecretView> {
    const row = await this.subscriptionRepository.findOne({ where: { id } });
    if (!row) throw new Error(`Webhook subscription ${id} not found`);

    if (dto.label !== undefined) row.label = dto.label;
    if (dto.targetUrl !== undefined) row.targetUrl = dto.targetUrl;
    if (dto.eventTypes !== undefined) row.eventTypes = dto.eventTypes;
    if (dto.state !== undefined) {
      row.state =
        dto.state === 'paused'
          ? WebhookSubscriptionState.PAUSED
          : WebhookSubscriptionState.ACTIVE;
    }
    const saved = await this.subscriptionRepository.save(row);
    return this.toView(saved);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    const row = await this.subscriptionRepository.findOne({ where: { id } });
    if (!row) throw new Error(`Webhook subscription ${id} not found`);
    await this.subscriptionRepository.remove(row);
    this.logger.log(`Deleted outbound webhook subscription ${id}`);
    return { id, deleted: true };
  }

  /**
   * Rotates the signing secret. Pending deliveries for this subscription are
   * skipped by the dispatcher (they were signed with the old secret), so the
   * caller (controller) surfaces the rotation in the response.
   */
  async rotateSecret(id: string): Promise<WebhookSubscriptionSecretView> {
    const row = await this.subscriptionRepository.findOne({ where: { id } });
    if (!row) throw new Error(`Webhook subscription ${id} not found`);

    const secret = generateWebhookSigningSecret();
    row.secretCiphertext = encryptSecret(secret, this.encryptionKey);
    row.secretHint = secret.slice(-4);
    const saved = await this.subscriptionRepository.save(row);
    this.logger.log(`Rotated signing secret for subscription ${id}`);
    return this.toView(saved, secret);
  }

  /** Decrypts a subscription's signing secret (dispatcher/worker use only). */
  revealSecret(entity: WebhookSubscription): string;
  revealSecret(entity: WebhookSubscription, keyOverride: string): string;
  revealSecret(entity: WebhookSubscription, keyOverride?: string): string {
    return decryptSecret(
      entity.secretCiphertext,
      keyOverride ?? this.encryptionKey,
    );
  }
}
