import { Injectable, Logger } from '@nestjs/common';
import { featureFlagsConfig, FeatureFlagConfig } from '../../config/feature-flags.config';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
}

/**
 * Feature Flags Service
 * 
 * Manages feature flags for gradual rollouts and A/B testing.
 * Flags can be enabled/disabled via environment variables.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private flags: FeatureFlagConfig;

  constructor() {
    this.flags = featureFlagsConfig;
    this.logFlagsStatus();
  }

  /**
   * Check if a specific feature flag is enabled
   * 
   * @param flagName - The name of the feature flag
   * @returns boolean - Whether the flag is enabled
   */
  isEnabled(flagName: string): boolean {
    const flag = this.flags[flagName];
    
    if (!flag) {
      this.logger.warn(`Feature flag "${flagName}" not found`);
      return false;
    }

    return flag.enabled;
  }

  /**
   * Get all feature flags with their current status
   * 
   * @returns Array of feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Object.entries(this.flags).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      description: config.description,
    }));
  }

  /**
   * Get a specific feature flag details
   * 
   * @param flagName - The name of the feature flag
   * @returns FeatureFlag or undefined if not found
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    const flag = this.flags[flagName];
    
    if (!flag) {
      return undefined;
    }

    return {
      name: flagName,
      enabled: flag.enabled,
      description: flag.description,
    };
  }

  /**
   * Guard method to check if feature is enabled
   * Throws error if feature is disabled
   * 
   * @param flagName - The name of the feature flag
   * @throws Error if feature is disabled
   */
  guard(flagName: string): void {
    if (!this.isEnabled(flagName)) {
      this.logger.warn(`Access denied: Feature "${flagName}" is disabled`);
      throw new Error(`Feature "${flagName}" is currently disabled`);
    }
  }

  /**
   * Log the current status of all feature flags
   */
  private logFlagsStatus(): void {
    this.logger.log('Feature Flags Status:');
    Object.entries(this.flags).forEach(([name, config]) => {
      this.logger.log(`  ${name}: ${config.enabled ? 'ENABLED' : 'DISABLED'} (${config.description})`);
    });
  }
}
