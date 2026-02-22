import { Global, Module, DynamicModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppLoggerService } from './logger.service';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';
import { ErrorLoggerFilter } from '../filter/error-logger.filter';
import { Reflector } from '@nestjs/core';

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
      Reflector,
    ];

    if (enableInterceptor) {
      providers.push({
        provide: APP_INTERCEPTOR,
        useFactory: (logger: AppLoggerService, reflector: Reflector) => {
          return new LoggingInterceptor(logger, reflector);
        },
        inject: [AppLoggerService, Reflector],
      });
    }

    if (enableErrorFilter) {
      providers.push({
        provide: APP_FILTER,
        useFactory: (logger: AppLoggerService) => {
          return new ErrorLoggerFilter(logger);
        },
        inject: [AppLoggerService],
      });
    }

    return {
      module: LoggerModule,
      global: isGlobal,
      providers,
      exports: [AppLoggerService],
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
