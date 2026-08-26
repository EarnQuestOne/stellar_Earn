import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../jobs/jobs.module';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { WebhookDeliveryProcessor } from './webhook-delivery.processor';
import { OutboundWebhookScheduler } from './outbound-webhook.scheduler';
import { JobsService } from '../jobs/jobs.service';

/**
 * Outbound event-subscription webhook delivery (#2306).
 *
 * Registration: the delivery processor registers itself with JobsService in
 * onModuleInit (same pattern as EmailService → registerEmailProcessor), so
 * this module owns its code while JobsService owns queue/worker lifecycle.
 * The cron scheduler works because PayoutsModule already registers
 * ScheduleModule.forRoot() globally.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery]),
    JobsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    WebhookDispatcherService,
    WebhookDeliveryProcessor,
    OutboundWebhookScheduler,
  ],
  exports: [SubscriptionsService, WebhookDispatcherService],
})
export class WebhooksOutboundModule implements OnModuleInit {
  constructor(
    private readonly jobsService: JobsService,
    private readonly deliveryProcessor: WebhookDeliveryProcessor,
  ) {}

  onModuleInit(): void {
    this.jobsService.registerOutboundWebhookProcessor(
      this.deliveryProcessor.process.bind(this.deliveryProcessor),
    );
  }
}
