type EnvVarType = 'string' | 'number' | 'boolean' | 'url' | 'port';

interface EnvVarSchema {
  type: EnvVarType;
  required?: boolean;
  default?: string | number | boolean;
  allowedValues?: string[];
  min?: number;
  max?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const ENV_SCHEMA: Record<string, EnvVarSchema> = {
  NODE_ENV: {
    type: 'string',
    required: true,
    default: 'development',
    allowedValues: ['development', 'test', 'production', 'staging'],
  },
  PORT: {
    type: 'port',
    required: false,
    default: 3001,
    min: 1,
    max: 65535,
  },

  // Database
  DATABASE_URL: {
    type: 'string',
    required: true,
  },
  DB_POOL_MAX: {
    type: 'number',
    required: false,
    default: 10,
    min: 1,
    max: 100,
  },
  DB_POOL_MIN: {
    type: 'number',
    required: false,
    default: 2,
    min: 0,
    max: 50,
  },

  // JWT Authentication
  JWT_SECRET: {
    type: 'string',
    required: true,
  },
  JWT_ACCESS_TOKEN_EXPIRATION: {
    type: 'string',
    required: true,
    default: '15m',
  },
  JWT_REFRESH_TOKEN_EXPIRATION: {
    type: 'string',
    required: true,
    default: '7d',
  },

  // Rate Limiting
  RATE_LIMIT_TTL: {
    type: 'number',
    required: false,
    default: 60,
    min: 1,
  },
  RATE_LIMIT_MAX: {
    type: 'number',
    required: false,
    default: 100,
    min: 1,
  },

  // Logging
  LOG_LEVEL: {
    type: 'string',
    required: false,
    default: 'info',
    allowedValues: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
  },
};

function validateEnvVar(name: string, schema: EnvVarSchema): string[] {
  const errors: string[] = [];
  const raw = process.env[name];

  if (raw === undefined || raw === '') {
    if (schema.required && schema.default === undefined) {
      errors.push(`Required environment variable "${name}" is missing`);
    }
    return errors;
  }

  switch (schema.type) {
    case 'number':
    case 'port': {
      const num = Number(raw);
      if (isNaN(num) || !Number.isInteger(num)) {
        errors.push(
          `Environment variable "${name}" must be an integer, got: "${raw}"`,
        );
        break;
      }
      if (schema.min !== undefined && num < schema.min) {
        errors.push(
          `Environment variable "${name}" must be >= ${schema.min}, got: ${num}`,
        );
      }
      if (schema.max !== undefined && num > schema.max) {
        errors.push(
          `Environment variable "${name}" must be <= ${schema.max}, got: ${num}`,
        );
      }
      break;
    }
    case 'boolean': {
      if (!['true', 'false', '1', '0'].includes(raw.toLowerCase())) {
        errors.push(
          `Environment variable "${name}" must be a boolean (true/false/1/0), got: "${raw}"`,
        );
      }
      break;
    }
    case 'url': {
      try {
        new URL(raw);
      } catch {
        errors.push(
          `Environment variable "${name}" must be a valid URL, got: "${raw}"`,
        );
      }
      break;
    }
    case 'string': {
      if (schema.allowedValues && !schema.allowedValues.includes(raw)) {
        errors.push(
          `Environment variable "${name}" must be one of [${schema.allowedValues.join(', ')}], got: "${raw}"`,
        );
      }
      break;
    }
  }

  return errors;
}

export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [name, schema] of Object.entries(ENV_SCHEMA)) {
    const varErrors = validateEnvVar(name, schema);
    errors.push(...varErrors);
  }

  // Warn about potentially unsafe JWT secret in production
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET.length < 32
  ) {
    warnings.push('JWT_SECRET should be at least 32 characters in production');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertEnvValid(): void {
  const { valid, errors, warnings } = validateEnv();

  for (const warning of warnings) {
    console.warn(`[ENV] Warning: ${warning}`);
  }

  if (!valid) {
    const message = [
      'Application startup aborted â€” environment validation failed:',
      ...errors.map((e) => `  - ${e}`),
    ].join('\n');
    throw new Error(message);
  }
}
