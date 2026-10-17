import { ReplicaRoutingService, isReadQuery } from './replica-routing.service';

const mockRepository = { find: jest.fn() } as any;
const mockReplicaRepository = { find: jest.fn() } as any;

const mockPrimaryDataSource = {
  isInitialized: true,
  getRepository: jest.fn().mockReturnValue(mockRepository),
  entityMetadatas: [],
} as any;

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');
  return {
    ...actual,
    DataSource: jest.fn().mockImplementation(() => ({
      isInitialized: false,
      initialize: jest.fn().mockImplementation(function (this: any) {
        this.isInitialized = true;
        this.getRepository = jest.fn().mockReturnValue(mockReplicaRepository);
        this.entityMetadatas = [];
        this.destroy = jest.fn();
        return Promise.resolve();
      }),
      destroy: jest.fn(),
      getRepository: jest.fn().mockReturnValue(mockReplicaRepository),
    })),
  };
});

describe('ReplicaRoutingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DB_REPLICA_HOST;
    delete process.env.DB_REPLICA_PORT;
    delete process.env.DB_REPLICA_NAME;
    delete process.env.DB_REPLICA_USER;
    delete process.env.DB_REPLICA_PASSWORD;
  });

  describe('isReadQuery', () => {
    it('returns true for SELECT queries', () => {
      expect(isReadQuery('SELECT * FROM users')).toBe(true);
      expect(isReadQuery('  select id from quests')).toBe(true);
      expect(isReadQuery('\nSELECT COUNT(*) FROM submissions')).toBe(true);
    });

    it('returns false for write queries', () => {
      expect(isReadQuery('INSERT INTO users (name) VALUES ($1)')).toBe(false);
      expect(isReadQuery('UPDATE users SET name = $1')).toBe(false);
      expect(isReadQuery('DELETE FROM users WHERE id = $1')).toBe(false);
    });

    it('returns false for empty or non-SQL strings', () => {
      expect(isReadQuery('')).toBe(false);
      expect(isReadQuery('SHOW DATABASES')).toBe(false);
    });
  });

  describe('ReplicaRoutingService', () => {
    it('uses primary when no replica is configured', async () => {
      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();

      expect(service.isReplicaAvailable()).toBe(false);
      expect(service.getPrimaryRepository('User')).toBe(mockRepository);
      expect(service.getReplicaRepository('User')).toBe(mockRepository);
    });

    it('connects to replica when env vars are provided', async () => {
      process.env.DB_REPLICA_HOST = 'replica.example.com';
      process.env.DB_REPLICA_PORT = '5433';
      process.env.DB_REPLICA_NAME = 'stellar_earn_replica';
      process.env.DB_REPLICA_USER = 'readonly';
      process.env.DB_REPLICA_PASSWORD = 'secret';

      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();

      expect(service.isReplicaAvailable()).toBe(true);

      await service.onModuleDestroy();
    });

    it('returns replica-backed repository when replica is available', async () => {
      process.env.DB_REPLICA_HOST = 'replica.example.com';
      process.env.DB_REPLICA_NAME = 'stellar_earn_replica';
      process.env.DB_REPLICA_USER = 'readonly';
      process.env.DB_REPLICA_PASSWORD = 'secret';

      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();

      const repo = service.getReplicaRepository('User');
      expect(repo).toBe(mockReplicaRepository);

      await service.onModuleDestroy();
    });

    it('initializes only once', async () => {
      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();
      await service.initialize();

      expect(service.isReplicaAvailable()).toBe(false);
    });

    it('always returns primary repository via getPrimaryRepository', async () => {
      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();

      const repo = service.getPrimaryRepository('User');
      expect(repo).toBe(mockRepository);
    });

    it('cleans up replica connection on destroy', async () => {
      process.env.DB_REPLICA_HOST = 'replica.example.com';
      process.env.DB_REPLICA_NAME = 'stellar_earn_replica';
      process.env.DB_REPLICA_USER = 'readonly';
      process.env.DB_REPLICA_PASSWORD = 'secret';

      const service = new ReplicaRoutingService(mockPrimaryDataSource);
      await service.initialize();

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
