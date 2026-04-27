import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';
import { HealthController } from './health.controller';
import { DatabaseHealthService } from './services/database-health.service';
import { CacheHealthService } from './services/cache-health.service';
import { ExternalHealthService } from './services/external-health.service';
import { DatabasePoolMonitorService } from './services/database-pool-monitor.service';
import { MetricsService } from '../../common/services/metrics.service';

@Module({
  imports: [TypeOrmModule, ConfigModule, CacheModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthService,
    CacheHealthService,
    ExternalHealthService,
    DatabasePoolMonitorService,
    MetricsService,
  ],
  exports: [MetricsService],
})
export class HealthModule {}
