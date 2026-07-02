import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '../../common/http-client/http-client.module';
import { ModerationItem } from './entities/moderation-item.entity';
import { ModerationAppeal } from './entities/moderation-appeal.entity';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { KeywordFilterService } from './filters/keyword-filter.service';
import { ContentClassifierService } from './filters/content-classifier.service';
import { ImageModerationService } from './filters/image-moderation.service';
import { ExternalModerationApiService } from './filters/external-moderation-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationItem, ModerationAppeal]), HttpClientModule],
  controllers: [ModerationController],
  providers: [
    ModerationService,
    KeywordFilterService,
    ContentClassifierService,
    ImageModerationService,
    ExternalModerationApiService,
  ],
  exports: [ModerationService],
})
export class ModerationModule {}
