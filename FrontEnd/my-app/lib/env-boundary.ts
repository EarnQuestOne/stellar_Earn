export class ConfigurationBoundaryError extends Error {
  constructor(public variableName: string, contextBoundary: string) {
    super(`Configuration Error: [${contextBoundary}] Missing mandatory environment variable "${variableName}". Ensure it is specified in your .env configuration.`);
    this.name = 'ConfigurationBoundaryError';
  }
}

/**
 * Validates and retrieves a target environment parameter at the active operational boundary.
 * Prevents initialization crashes by throwing lazily only when requested.
 */
export const getEnvParamLazy = (
  key: string, 
  boundaryName: string, 
  fallback?: string
): string => {
  const value = process.env[key];

  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    // Task Requirement: Lazy runtime validation per boundary instead of global crashes
    throw new ConfigurationBoundaryError(key, boundaryName);
  }

  return value;
};

// ============================================================================
// On-Demand Boundary Context Mappings
// ============================================================================

export const getStellarNetworkConfig = () => ({
  network: getEnvParamLazy('NEXT_PUBLIC_STELLAR_NETWORK', 'Stellar Network Connection', 'TESTNET'),
  horizonUrl: getEnvParamLazy('NEXT_PUBLIC_HORIZON_URL', 'Stellar Network Connection')
});

export const getAnalyticsConfig = () => ({
  sentryDsn: getEnvParamLazy('NEXT_PUBLIC_SENTRY_DSN', 'Observability Analytics Module')
});