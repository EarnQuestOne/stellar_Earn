import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { SorobanContractReadCacheService } from './soroban-contract-read-cache.service';
import { EventStore } from '../../events/entities/event-store.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EventStore])],
  providers: [
    StellarService,
    SorobanQuestReaderService,
    SorobanContractReadCacheService,
  ],
  exports: [
    StellarService,
    SorobanQuestReaderService,
    SorobanContractReadCacheService,
  ],
})
export class StellarModule {}
