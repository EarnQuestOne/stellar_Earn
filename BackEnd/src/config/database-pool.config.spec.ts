import { buildPoolConfig, buildPoolExtra } from './database-pool.config';

describe('DatabasePoolConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('buildPoolConfig', () => {
    it('should return defaults when no env vars set', () => {
      const config = buildPoolConfig({});
      expect(config.min).toBe(2);
      expect(config.max).toBe(20);
      expect(config.idleTimeoutMs).toBe(30000);
      expect(config.connectionTimeoutMs).toBe(10000);
    });

    it('should read custom values from env', () => {
      const config = buildPoolConfig({
        DB_POOL_MIN: '5',
        DB_POOL_MAX: '50',
        DB_POOL_IDLE_TIMEOUT_MS: '60000',
        DB_POOL_CONNECTION_TIMEOUT_MS: '3000',
      });
      expect(config.min).toBe(5);
      expect(config.max).toBe(50);
      expect(config.idleTimeoutMs).toBe(60000);
      expect(config.connectionTimeoutMs).toBe(3000);
    });

    it('should throw when min > max', () => {
      expect(() =>
        buildPoolConfig({ DB_POOL_MIN: '30', DB_POOL_MAX: '10' }),
      ).toThrow('must be <= DB_POOL_MAX');
    });

    it('should throw on negative values', () => {
      expect(() => buildPoolConfig({ DB_POOL_MIN: '-1' })).toThrow(
        'non-negative integer',
      );
    });

    it('should throw on non-numeric values', () => {
      expect(() => buildPoolConfig({ DB_POOL_MAX: 'abc' })).toThrow(
        'non-negative integer',
      );
    });

    it('should allow min equal to max', () => {
      const config = buildPoolConfig({ DB_POOL_MIN: '10', DB_POOL_MAX: '10' });
      expect(config.min).toBe(10);
      expect(config.max).toBe(10);
    });
  });

  describe('buildPoolExtra', () => {
    it('should return pg-driver compatible extra object', () => {
      const extra = buildPoolExtra({});
      expect(extra).toHaveProperty('max');
      expect(extra).toHaveProperty('min');
      expect(extra).toHaveProperty('connectionTimeoutMillis');
      expect(extra).toHaveProperty('idleTimeoutMillis');
    });

    it('should use custom values', () => {
      const extra = buildPoolExtra({ DB_POOL_MAX: '30', DB_POOL_MIN: '5' });
      expect(extra.max).toBe(30);
      expect(extra.min).toBe(5);
    });
  });
});
