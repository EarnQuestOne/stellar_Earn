import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { MultiSigWebhookHandler } from './multisig-webhook.handler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payout } from '../payouts/entities/payout.entity';
import { MultiSigTransaction } from '../stellar/multisig/entities/multisig-transaction.entity';
import { MultiSigWallet } from '../stellar/multisig/entities/multisig-wallet.entity';
import { MultiSigWalletService } from '../stellar/multisig/services/multisig-wallet.service';
import { MultiSigPayoutService } from '../stellar/multisig/services/multisig-payout.service';

@Module({
  imports: [TypeOrmModule.forFeature([MultiSigTransaction, Payout, MultiSigWallet])],
  controllers: [WebhooksController],
  providers: [WebhooksService, GithubHandler, ApiHandler, MultiSigWebhookHandler, MultiSigPayoutService, MultiSigWalletService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

