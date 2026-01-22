import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, GithubHandler, ApiHandler],
  exports: [WebhooksService],
})
export class WebhooksModule {}