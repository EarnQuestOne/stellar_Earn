import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseIndicator } from './indicators/database.indicator';
import { RedisIndicator } from './indicators/redis.indicator';
import { DatabasePoolMonitorService } from './services/database-pool-monitor.service';
// MetricsService is provided globally by LoggerModule — no local import needed.

@Module({
  imports: [TerminusModule, TypeOrmModule, ConfigModule],
  controllers: [HealthController],
  providers: [DatabaseIndicator, RedisIndicator, DatabasePoolMonitorService],
})
export class HealthModule {}
