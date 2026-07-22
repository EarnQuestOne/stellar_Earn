import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { SorobanQuestReaderService } from './soroban-quest-reader.service';
import { EventStore } from '../../events/entities/event-store.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([EventStore])],
  providers: [StellarService, SorobanQuestReaderService],
  exports: [StellarService, SorobanQuestReaderService],
})
export class StellarModule {}
