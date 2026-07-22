import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailTemplateEngine } from './templates/template.engine';
import { JobsModule } from '../jobs/jobs.module';
import emailConfig from '../../config/email.config';

@Module({
  imports: [ConfigModule.forFeature(emailConfig), forwardRef(() => JobsModule)],
  controllers: [EmailController],
  providers: [EmailService, EmailTemplateEngine],
  exports: [EmailService],
})
export class EmailModule {}
