import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { StellarSubmissionService } from './stellar-submission.service';
import { StellarPaymentService } from './stellar-payment.service';
import { StellarEventIngestionService } from './stellar-event-ingestion.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { StellarAccountCacheService } from './stellar-account-cache.service';
import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';
import { EventStore } from '../../events/entities/event-store.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EventStore])],
  providers: [
    StellarService,
    StellarSubmissionService,
    StellarPaymentService,
    StellarEventIngestionService,
    SorobanQuestReaderService,
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
  ],
  exports: [
    StellarService,
    StellarSubmissionService,
    StellarPaymentService,
    StellarEventIngestionService,
    SorobanQuestReaderService,
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
  ],
})
export class StellarModule {}
