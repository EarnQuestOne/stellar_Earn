import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseIndicator } from './indicators/database.indicator';
import { RedisIndicator } from './indicators/redis.indicator';

@Module({
  imports: [TerminusModule, TypeOrmModule, ConfigModule],
  controllers: [HealthController],
  providers: [DatabaseIndicator, RedisIndicator],
})
export class HealthModule {}
