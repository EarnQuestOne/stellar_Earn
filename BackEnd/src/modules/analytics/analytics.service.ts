import { LazyInitializer } from '../../common/utils/lazy-initializer';
import { Logger } from '@nestjs/common';

export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor() {
    // Simulate heavy initialization cost (e.g., establishing external socket connections)
    this.logger.log('AnalyticsService: Performing heavy boot initialization...');
  }

  public trackEvent(name: string, metadata: Record<string, any>): void {
    this.logger.log(`Tracking event: ${name}`);
    // Logic to send data to third-party provider
  }
}

// Create the lazy wrapper but do not call the factory yet
const lazyAnalytics = new LazyInitializer(() => new AnalyticsService());

/**
 * Exported helper to access the AnalyticsService. 
 * The service is instantiated ONLY upon the first call to this function.
 */
export const getAnalyticsService = (): AnalyticsService => {
  return lazyAnalytics.getInstance();
};