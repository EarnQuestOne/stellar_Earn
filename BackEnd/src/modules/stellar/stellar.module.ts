import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { StellarAccountCacheService } from './stellar-account-cache.service';
import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';
import { EventStore } from '../../events/entities/event-store.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EventStore])],
  providers: [
    StellarService,
    SorobanQuestReaderService,
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
  ],
  exports: [
    StellarService,
    SorobanQuestReaderService,
    StellarAccountCacheService,
    SorobanRpcClientPoolService,
  ],
})
export class StellarModule {}
