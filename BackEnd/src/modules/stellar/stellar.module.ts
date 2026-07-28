import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { EventStore } from '../../events/entities/event-store.entity';
import { RetryService } from '../../common/services/retry.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EventStore])],
  providers: [
    StellarService,
    SorobanQuestReaderService,
    RetryService,
    CircuitBreakerService,
  ],
  exports: [StellarService, SorobanQuestReaderService],
})
export class StellarModule {}
