import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { MultiSigWebhookHandler } from './multisig-webhook.handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultiSigTransaction } from '../stellar/multisig/entities/multisig-transaction.entity';
import { MultiSigPayoutService } from '../stellar/multisig/services/multisig-payout.service';

@Module({
  imports: [TypeOrmModule.forFeature([MultiSigTransaction])],
  controllers: [WebhooksController],
  providers: [WebhooksService, GithubHandler, ApiHandler, MultiSigWebhookHandler, MultiSigPayoutService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

