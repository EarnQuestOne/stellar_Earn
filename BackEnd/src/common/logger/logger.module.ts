import { Global, Module, DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppLoggerService } from './logger.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { ErrorLoggerFilter } from '../filter/error-logger.filter';
import { MetricsService } from '../services/metrics.service';
import { AlertService } from '../services/alert.service';
import { TracingService } from '../tracing/tracing.service';

export interface LoggerModuleOptions {
  isGlobal?: boolean;
  enableInterceptor?: boolean;
  enableErrorFilter?: boolean;
}

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    const {
      isGlobal = true,
      enableInterceptor = true,
      enableErrorFilter = true,
    } = options;

    const providers: any[] = [
      AppLoggerService,
      MetricsService,
      AlertService,
      TracingService,
      Reflector,
    ];

    if (enableInterceptor) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useFactory: (
          logger: AppLoggerService,
          reflector: Reflector,
          metrics: MetricsService,
          alerts: AlertService,
        ) => new LoggingInterceptor(logger, reflector, metrics, alerts),
        inject: [AppLoggerService, Reflector, MetricsService, AlertService],
      });
    }

    if (enableErrorFilter) {
      providers.push({
        provide: APP_FILTER,
        useFactory: (logger: AppLoggerService) => new ErrorLoggerFilter(logger),
        inject: [AppLoggerService],
      });
    }

    return {
      module: LoggerModule,
      global: isGlobal,
      providers,
      exports: [AppLoggerService, MetricsService, AlertService, TracingService],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: LoggerModule,
      providers: [AppLoggerService],
      exports: [AppLoggerService],
    };
  }
}
