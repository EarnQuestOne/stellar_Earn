import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { setupSwagger } from './config/swagger.config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { JobsService } from './modules/jobs/jobs.service';
import { createBullBoardRouter } from './modules/jobs/jobs.board';
import { CustomValidationPipe } from './common/pipes/validation.pipe';
import { SanitizationPipe } from './common/pipes/sanitization.pipe';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { SecurityExceptionFilter } from './common/filters/security-exception.filter';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { getSecurityConfig } from './config/security.config';
import { getCorsConfig } from './config/cors.config';
import { createLoggerConfig } from './config/logger.config';
import { AppLoggerService } from './common/logger/logger.service';

const bootstrapLogger = WinstonModule.createLogger(createLoggerConfig());

process.on('unhandledRejection', (reason, promise) => {
  bootstrapLogger.error('Unhandled Rejection', {
    promise: String(promise),
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  bootstrapLogger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

async function bootstrap() {
  const startTime = process.hrtime.bigint();

  try {
    bootstrapLogger.log('Starting StellarEarn API...');

    const app = await NestFactory.create(AppModule, {
      logger: WinstonModule.createLogger(createLoggerConfig()),
      abortOnError: false,
    });

    const logger = app.get(AppLoggerService);
    logger.setContext('Bootstrap');

    logger.log('Application instance created', 'Bootstrap');

    app.use(new SecurityMiddleware().use.bind(new SecurityMiddleware()));

    const configService = app.get(ConfigService);
    app.use(helmet(getSecurityConfig(configService)));

    app.enableCors(getCorsConfig());

    app.useGlobalPipes(
      new SanitizationPipe(),
      new CustomValidationPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false,
        exceptionFactory: (errors) => {
          return new Error(
            JSON.stringify({
              message: 'Validation failed',
              errors: errors.map((error) => ({
                property: error.property,
                constraints: error.constraints,
              })),
            }),
          );
        },
      }),
    );

    app.useGlobalFilters(
      new SecurityExceptionFilter(),
      new ValidationExceptionFilter(),
    );

    logger.log('Security middleware and pipes configured', 'Bootstrap');

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    setupSwagger(app, configService);

    try {
      const jobsService = app.get(JobsService);
      const bullRouter = createBullBoardRouter(jobsService as JobsService);
      app.use('/admin/queues', bullRouter);
      logger.log('Bull Board mounted at /admin/queues', 'Bootstrap');
    } catch {
      logger.debug('Bull Board not available, skipping mount', 'Bootstrap');
    }

    logger.log('Swagger configured and versioning enabled', 'Bootstrap');

    app.enableShutdownHooks();

    const port = process.env.PORT || 3001;

    await app.listen(port);

    const endTime = process.hrtime.bigint();
    const bootDurationMs = Number(endTime - startTime) / 1_000_000;

    logger.log(`Application started successfully`, 'Bootstrap', {
      port,
      environment: process.env.NODE_ENV || 'development',
      bootDurationMs: Math.round(bootDurationMs),
      urls: {
        api: `http://localhost:${port}/api`,
        docs: `http://localhost:${port}/api/docs`,
        health: `http://localhost:${port}/api/v1/health`,
      },
    });

    logger.performance({
      operation: 'application_bootstrap',
      durationMs: Math.round(bootDurationMs),
      success: true,
      metadata: { port, environment: process.env.NODE_ENV },
    });
  } catch (error) {
    bootstrapLogger.error('Bootstrap failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  bootstrapLogger.error('Fatal error during bootstrap', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
