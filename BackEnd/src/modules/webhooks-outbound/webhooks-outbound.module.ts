import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';

/**
 * Outbound event-subscription webhook system: lets third-party consumers
 * register for platform domain events and receive signed, retried, observable
 * HTTP callbacks. Distinct from the inbound `webhooks` module.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery])],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    WebhookDispatcherService,
    WebhookDeliveryProcessor,
  ],
  exports: [SubscriptionsService, WebhookDispatcherService],
})
export class WebhooksOutboundModule {}
