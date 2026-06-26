import { z } from 'zod';

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  // API Configuration
  NEXT_PUBLIC_API_BASE_URL: {
    description: 'Backend API base URL',
    example: 'http://localhost:3001',
    required: true,
    default: 'http://localhost:3000',
  },
} as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  // Stellar Network Configuration
  NEXT_PUBLIC_STELLAR_NETWORK: {
    description: 'Stellar network (testnet/mainnet)',
    example: 'testnet',
    default: 'testnet',
  },
  NEXT_PUBLIC_SOROBAN_RPC_URL: {
    description: 'Soroban RPC endpoint URL',
    example: 'https://soroban-testnet.stellar.org',
    default: 'https://soroban-testnet.stellar.org',
  },
  NEXT_PUBLIC_CONTRACT_ID: {
    description: 'Deployed contract ID',
    example: 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    default: '',
  },

  // Analytics Configuration
  NEXT_PUBLIC_ANALYTICS_TEST_MODE: {
    description: 'Enable analytics test mode',
    example: 'true',
    default: 'false',
  },
  NEXT_PUBLIC_ANALYTICS_ID: {
    description: 'Analytics tracking ID',
    example: 'G-XXXXXXXXXX',
    default: '',
  },
  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: {
    description: 'Sentry DSN for error tracking',
    example: 'https://examplePublicKey@o0.ingest.sentry.io/0',
    default: '',
  },

  // E2E Testing
  E2E_BASE_URL: {
    description: 'Base URL for E2E tests',
    example: 'http://localhost:3000',
    default: 'http://localhost:3000',
  },
} as const;

// Define Zod schema dynamically/statically using these mappings
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default(REQUIRED_ENV_VARS.NEXT_PUBLIC_API_BASE_URL.default),
  NEXT_PUBLIC_STELLAR_NETWORK: z
    .enum(['testnet', 'mainnet'])
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_STELLAR_NETWORK.default),
  NEXT_PUBLIC_SOROBAN_RPC_URL: z
    .string()
    .url()
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_SOROBAN_RPC_URL.default),
  NEXT_PUBLIC_CONTRACT_ID: z
    .string()
    .optional()
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_CONTRACT_ID.default),
  NEXT_PUBLIC_ANALYTICS_TEST_MODE: z
    .enum(['true', 'false'])
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_ANALYTICS_TEST_MODE.default),
  NEXT_PUBLIC_ANALYTICS_ID: z
    .string()
    .optional()
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_ANALYTICS_ID.default),
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .optional()
    .default(OPTIONAL_ENV_VARS.NEXT_PUBLIC_SENTRY_DSN.default),
  E2E_BASE_URL: z
    .string()
    .url()
    .default(OPTIONAL_ENV_VARS.E2E_BASE_URL.default),
});

/**
 * Validation error details
 */
interface ValidationError {
  variable: string;
  description: string;
  example: string;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Next.js client bundles only inline NEXT_PUBLIC_* env vars when accessed
 * statically. Dynamic access (process.env[name]) returns undefined in browser.
 */
function readEnvValue(name: string): string | undefined {
  switch (name) {
    case 'NEXT_PUBLIC_API_BASE_URL':
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    case 'NEXT_PUBLIC_STELLAR_NETWORK':
      return process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    case 'NEXT_PUBLIC_SOROBAN_RPC_URL':
      return process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
    case 'NEXT_PUBLIC_CONTRACT_ID':
      return process.env.NEXT_PUBLIC_CONTRACT_ID;
    case 'NEXT_PUBLIC_ANALYTICS_TEST_MODE':
      return process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE;
    case 'NEXT_PUBLIC_ANALYTICS_ID':
      return process.env.NEXT_PUBLIC_ANALYTICS_ID;
    case 'NEXT_PUBLIC_SENTRY_DSN':
      return process.env.NEXT_PUBLIC_SENTRY_DSN;
    case 'E2E_BASE_URL':
      return process.env.E2E_BASE_URL;
    default:
      return process.env[name];
  }
}

/**
 * Validates all required environment variables
 */
export function validateEnv(): ValidationResult {
  // Statically construct the env object to allow Next.js compiler inlining
  const envObj = {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
    NEXT_PUBLIC_CONTRACT_ID: process.env.NEXT_PUBLIC_CONTRACT_ID,
    NEXT_PUBLIC_ANALYTICS_TEST_MODE:
      process.env.NEXT_PUBLIC_ANALYTICS_TEST_MODE,
    NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    E2E_BASE_URL: process.env.E2E_BASE_URL,
  };

  const parseResult = envSchema.safeParse(envObj);
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!parseResult.success) {
    parseResult.error.issues.forEach((issue) => {
      const field = issue.path[0] as string;
      const requiredConfig =
        REQUIRED_ENV_VARS[field as keyof typeof REQUIRED_ENV_VARS];
      const optionalConfig =
        OPTIONAL_ENV_VARS[field as keyof typeof OPTIONAL_ENV_VARS];

      const config = requiredConfig || optionalConfig;
      if (config) {
        errors.push({
          variable: field,
          description: config.description,
          example: config.example,
        });
      }
    });
  }

  // Check optional variables and warn about missing ones to match expectations of warning reporting
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = envObj[name as keyof typeof envObj];
    if (!value && config.default) {
      warnings.push(`${name} not set, using default: "${config.default}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Formats validation errors into a readable error message
 */
function formatValidationErrors(errors: ValidationError[]): string {
  const lines = [
    '❌ Missing or Invalid Required Environment Variables',
    '',
    'The following environment variables failed validation:',
    '',
  ];

  errors.forEach((error, index) => {
    lines.push(`${index + 1}. ${error.variable}`);
    lines.push(`   Description: ${error.description}`);
    lines.push(`   Example: ${error.example}`);
    lines.push('');
  });

  lines.push(
    'Please create or update your .env.local file with valid variables.'
  );
  lines.push('See the README.md for more information.');

  return lines.join('\n');
}

/**
 * Validates environment variables and throws an error if validation fails
 * This should be called at application startup
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment Variable Warnings:');
    result.warnings.forEach((warning) => console.warn(`   ${warning}`));
    console.warn('');
  }

  // Throw error if validation fails
  if (!result.valid) {
    const errorMessage = formatValidationErrors(result.errors);
    console.error(errorMessage);
    throw new Error('Environment variable validation failed');
  }

  // Log success in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
  }
}

/**
 * Gets an environment variable with a default value
 */
export function getEnv(
  name: keyof typeof OPTIONAL_ENV_VARS,
  defaultValue?: string
): string {
  const value = readEnvValue(name);
  if (value !== undefined && value !== '') return value;

  const config = OPTIONAL_ENV_VARS[name];
  if (config.default) return config.default;

  return defaultValue || '';
}

/**
 * Gets a required environment variable
 * Throws an error if the variable is not set
 */
export function getRequiredEnv(name: keyof typeof REQUIRED_ENV_VARS): string {
  const value = readEnvValue(name);
  if (value !== undefined && value !== '') return value;

  // If there's a default value, use it as fallback
  const config = REQUIRED_ENV_VARS[name];
  if (config.default) return config.default;

  throw new Error(
    `Required environment variable ${name} is not set. ` +
      `Please check your .env.local file.`
  );
}

/**
 * Type-safe environment configuration
 */
export const env = {
  // API
  apiBaseUrl: () => getRequiredEnv('NEXT_PUBLIC_API_BASE_URL'),

  // Stellar
  stellarNetwork: () => getEnv('NEXT_PUBLIC_STELLAR_NETWORK'),
  sorobanRpcUrl: () => getEnv('NEXT_PUBLIC_SOROBAN_RPC_URL'),
  contractId: () => getEnv('NEXT_PUBLIC_CONTRACT_ID'),

  // Analytics
  analyticsTestMode: () => getEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE') === 'true',
  analyticsId: () => getEnv('NEXT_PUBLIC_ANALYTICS_ID'),

  // Sentry
  sentryDsn: () => getEnv('NEXT_PUBLIC_SENTRY_DSN'),

  // Testing
  e2eBaseUrl: () => getEnv('E2E_BASE_URL'),

  // Node environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;
