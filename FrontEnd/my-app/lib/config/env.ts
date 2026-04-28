/**
 * Environment Variable Validation
 *
 * This module validates required environment variables at application startup
 * to ensure the app fails fast with clear error messages rather than failing
 * silently at runtime.
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  // API Configuration
  NEXT_PUBLIC_API_BASE_URL: {
    description: 'Backend API base URL',
    example: 'http://localhost:3001',
    required: true,
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

  // E2E Testing
  E2E_BASE_URL: {
    description: 'Base URL for E2E tests',
    example: 'http://localhost:3000',
    default: 'http://localhost:3000',
  },
} as const;

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
 * Validates a single environment variable
 */
function validateEnvVar(
  name: string,
  config: {
    description: string;
    example: string;
    required?: boolean;
    default?: string;
  }
): ValidationError | null {
  const value = process.env[name];

  // Check if required variable is missing
  if (config.required && !value) {
    return {
      variable: name,
      description: config.description,
      example: config.example,
    };
  }

  return null;
}

/**
 * Validates all required environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate required variables
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const error = validateEnvVar(name, config);
    if (error) {
      errors.push(error);
    }
  }

  // Check optional variables and warn about missing ones
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[name];
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
    '❌ Missing Required Environment Variables',
    '',
    'The following environment variables are required but not set:',
    '',
  ];

  errors.forEach((error, index) => {
    lines.push(`${index + 1}. ${error.variable}`);
    lines.push(`   Description: ${error.description}`);
    lines.push(`   Example: ${error.example}`);
    lines.push('');
  });

  lines.push('Please create a .env.local file with the required variables.');
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
  const value = process.env[name];
  if (value) return value;

  const config = OPTIONAL_ENV_VARS[name];
  if (config.default) return config.default;

  return defaultValue || '';
}

/**
 * Gets a required environment variable
 * Throws an error if the variable is not set
 */
export function getRequiredEnv(name: keyof typeof REQUIRED_ENV_VARS): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
        `Please check your .env.local file.`
    );
  }
  return value;
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

  // Testing
  e2eBaseUrl: () => getEnv('E2E_BASE_URL'),

  // Node environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;
