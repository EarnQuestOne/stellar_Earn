import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { JobsModule } from '../jobs/jobs.module';
import { LoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery]),
    EventEmitterModule,
    JobsModule,
    LoggerModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, WebhookDispatcherService],
  exports: [SubscriptionsService, WebhookDispatcherService],
})
export class WebhooksOutboundModule {}
