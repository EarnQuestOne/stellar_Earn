import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResourceLimitsService } from './resource-limits.service';
import { ProfilingService } from './profiling.service';
import { ProcessResourceController } from './process-resource.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ProcessResourceController],
  providers: [ResourceLimitsService, ProfilingService],
  exports: [ResourceLimitsService, ProfilingService],
})
export class ProcessResourceModule {}
