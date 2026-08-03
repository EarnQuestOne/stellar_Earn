import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../cache/cache.module';
import { StellarService } from './stellar.service';
import { StellarSubmissionService } from './stellar-submission.service';
import { StellarPaymentService } from './stellar-payment.service';
import { StellarEventIngestionService } from './stellar-event-ingestion.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
<<<<<<< HEAD
import { SorobanContractReadCacheService } from './soroban-contract-read-cache.service';
import { EventStore } from '../../events/entities/event-store.entity';

@Module({
  imports: [ConfigModule, CacheModule, TypeOrmModule.forFeature([EventStore])],
  providers: [
    StellarService,
    SorobanQuestReaderService,
    SorobanContractReadCacheService,
=======
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
  ],
  exports: [
    StellarService,
    StellarSubmissionService,
    StellarPaymentService,
    StellarEventIngestionService,
    SorobanQuestReaderService,
    SorobanQuestReaderService,
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
>>>>>>> origin/main
  ],
  exports: [
    StellarService,
    SorobanQuestReaderService,
<<<<<<< HEAD
    SorobanContractReadCacheService,
=======
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
>>>>>>> origin/main
  ],
})
export class StellarModule {}
