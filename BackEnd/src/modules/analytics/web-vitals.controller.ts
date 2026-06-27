import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { WebVitalsAnalyticsService } from './services/web-vitals.service';
import { WebVitalsDto } from './dto/web-vitals.dto';

@ApiTags('Analytics')
@Controller('analytics')
export class WebVitalsAnalyticsController {
  constructor(
    private readonly webVitalsAnalyticsService: WebVitalsAnalyticsService,
  ) {}

  @Post('web-vitals')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit({ limit: 60, ttlSeconds: 60 })
  @ApiOperation({
    summary: 'Collect web vitals metrics from clients',
    description:
      'Receives web performance metrics from client-side web-vitals instrumentation.',
  })
  @ApiBody({ type: WebVitalsDto })
  @ApiResponse({
    status: 202,
    description: 'Web vitals metric accepted successfully.',
  })
  createWebVitals(@Body() metric: WebVitalsDto): void {
    this.webVitalsAnalyticsService.recordWebVitals(metric);
  }
}
