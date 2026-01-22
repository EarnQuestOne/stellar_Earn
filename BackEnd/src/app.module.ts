import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [WebhooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
