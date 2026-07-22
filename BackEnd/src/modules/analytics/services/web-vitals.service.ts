import { Injectable, Logger } from '@nestjs/common';
import { WebVitalsDto } from '../dto/web-vitals.dto';

@Injectable()
export class WebVitalsAnalyticsService {
  private readonly logger = new Logger(WebVitalsAnalyticsService.name);

  recordWebVitals(metric: WebVitalsDto): void {
    this.logger.debug('Received web vitals metric', { metric });
    // Future work: queue or persist metrics for historical analysis.
  }
}
