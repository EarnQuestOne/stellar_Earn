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
import { MultiSigModule } from '../stellar/multisig/multisig.module';
import { TraceModule } from '../trace/trace.module';
import { BulkheadService } from '../../common/services/bulkhead.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MultiSigTransaction, Payout, MultiSigWallet]),
    TraceModule,
    MultiSigModule,
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    GithubHandler,
    ApiHandler,
    MultiSigWebhookHandler,
    BulkheadService,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
