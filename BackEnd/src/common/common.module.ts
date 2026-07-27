import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BodySizeLimitInterceptor } from './interceptors/body-size-limit.interceptor';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: BodySizeLimitInterceptor,
    },
  ],
})
export class CommonModule {}