import { Module } from '@nestjs/common';
import { QueryLoggerService } from './query-logger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Module({
  providers: [QueryLoggerService, EventEmitter2],
  exports: [QueryLoggerService],
})
export class QueryLoggerModule {}
