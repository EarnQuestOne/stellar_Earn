/**
 * Feature Flags Configuration
 * 
 * Defines all available feature flags with their default values.
 * Feature flags can be controlled via environment variables.
 */

export interface FeatureFlagConfig {
  [key: string]: {
    enabled: boolean;
    description: string;
    envVar: string;
  };
}

/**
 * Feature flags configuration
 * Add new flags here to control feature rollouts
 */
export const featureFlagsConfig: FeatureFlagConfig = {
  ENABLE_DARK_MODE: {
    enabled: process.env.FF_ENABLE_DARK_MODE === 'true' || false,
    description: 'Enable dark mode feature',
    envVar: 'FF_ENABLE_DARK_MODE',
  },
  ENABLE_NEW_CHECKOUT: {
    enabled: process.env.FF_ENABLE_NEW_CHECKOUT === 'true' || false,
    description: 'Enable new checkout flow',
    envVar: 'FF_ENABLE_NEW_CHECKOUT',
  },
  ENABLE_BETA_QUESTS: {
    enabled: process.env.FF_ENABLE_BETA_QUESTS === 'true' || false,
    description: 'Enable beta quests feature',
    envVar: 'FF_ENABLE_BETA_QUESTS',
  },
  ENABLE_ADVANCED_ANALYTICS: {
    enabled: process.env.FF_ENABLE_ADVANCED_ANALYTICS === 'true' || false,
    description: 'Enable advanced analytics dashboard',
    envVar: 'FF_ENABLE_ADVANCED_ANALYTICS',
  },
  ENABLE_NOTIFICATIONS_V2: {
    enabled: process.env.FF_ENABLE_NOTIFICATIONS_V2 === 'true' || false,
    description: 'Enable v2 notification system',
    envVar: 'FF_ENABLE_NOTIFICATIONS_V2',
  },
};

export default featureFlagsConfig;
