import { Module } from '@nestjs/common';
import { QueryMonitoringController } from './query-monitoring.controller';
import { QueryLoggerModule } from '../../common/query-logger/query-logger.module';

@Module({
  imports: [QueryLoggerModule],
  controllers: [QueryMonitoringController],
})
export class QueryMonitoringModule {}
