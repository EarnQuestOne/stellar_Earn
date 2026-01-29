// import { NestFactory } from '@nestjs/core';
// import { ValidationPipe } from '@nestjs/common';
// import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   app.enableCors({
//     origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//     }),
//   );

//   const config = new DocumentBuilder()
//     .setTitle('StellarEarn API')
//     .setDescription('Quest-based earning platform on Stellar blockchain')
//     .setVersion('1.0')
//     .addBearerAuth()
//     .addTag('Authentication')
//     .build();

//   const document = SwaggerModule.createDocument(app, config);
//   SwaggerModule.setup('api/docs', app, document);

//   const port = process.env.PORT || 3001;
//   await app.listen(port);
//   console.log(`🚀 Application is running on: http://localhost:${port}`);
//   console.log(
//     `📚 Swagger docs available at: http://localhost:${port}/api/docs`,
//   );
// }
// bootstrap();


import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Catch all unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

async function bootstrap() {
  try {
    console.log('🚀 Starting StellarEarn API...');

    // Create app with detailed logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      abortOnError: false, // Don't exit on initialization errors
    });

    console.log('✅ App created successfully');

    app.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    console.log('✅ Middleware configured');

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('StellarEarn API')
      .setDescription('Quest-based earning platform on Stellar blockchain')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    console.log('✅ Swagger configured');

    const port = process.env.PORT || 3001;

    console.log(`📡 Attempting to listen on port ${port}...`);

    // Try to listen with timeout
    const server = await app.listen(port);

    console.log(`🎉 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);

    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('💥 Bootstrap failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch(error => {
  console.error('💥 Fatal error during bootstrap:', error);
  process.exit(1);
});