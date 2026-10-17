/**
 * Database Connection Pool Configuration
 *
 * Reads pool settings from environment variables with production-ready
 * defaults. Validates constraints (min <= max, positive values).
 */

export interface DatabasePoolConfig {
  min: number;
  max: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
}

const DEFAULTS: DatabasePoolConfig = {
  min: 2,
  max: 20,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 10000,
};

/**
 * Parse a positive integer from an env var, falling back to `defaultVal`.
 */
function parsePositiveInt(
  envVal: string | undefined,
  defaultVal: number,
  name: string,
): number {
  if (envVal === undefined || envVal === '') return defaultVal;
  const parsed = parseInt(envVal, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(
      `Invalid ${name}: "${envVal}" — must be a non-negative integer`,
    );
  }
  return parsed;
}

/**
 * Build and validate the connection pool configuration from env vars.
 *
 * Env vars:
 *   DB_POOL_MIN                  (default: 2)
 *   DB_POOL_MAX                  (default: 20)
 *   DB_POOL_IDLE_TIMEOUT_MS      (default: 30000)
 *   DB_POOL_CONNECTION_TIMEOUT_MS (default: 10000)
 */
export function buildPoolConfig(
  env: Record<string, string | undefined> = process.env,
): DatabasePoolConfig {
  const min = parsePositiveInt(env.DB_POOL_MIN, DEFAULTS.min, 'DB_POOL_MIN');
  const max = parsePositiveInt(env.DB_POOL_MAX, DEFAULTS.max, 'DB_POOL_MAX');
  const idleTimeoutMs = parsePositiveInt(
    env.DB_POOL_IDLE_TIMEOUT_MS,
    DEFAULTS.idleTimeoutMs,
    'DB_POOL_IDLE_TIMEOUT_MS',
  );
  const connectionTimeoutMs = parsePositiveInt(
    env.DB_POOL_CONNECTION_TIMEOUT_MS,
    DEFAULTS.connectionTimeoutMs,
    'DB_POOL_CONNECTION_TIMEOUT_MS',
  );

  if (min > max) {
    throw new Error(
      `Invalid pool config: DB_POOL_MIN (${min}) must be <= DB_POOL_MAX (${max})`,
    );
  }

  return { min, max, idleTimeoutMs, connectionTimeoutMs };
}

/**
 * Build TypeORM `extra` options from pool config.
 * This object is passed directly to the pg driver.
 */
export function buildPoolExtra(
  env: Record<string, string | undefined> = process.env,
): Record<string, number> {
  const config = buildPoolConfig(env);
  return {
    max: config.max,
    min: config.min,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    idleTimeoutMillis: config.idleTimeoutMs,
  };
}
