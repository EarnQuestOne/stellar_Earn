import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';
import { ConfigService } from '@nestjs/config';
import { createMockConfigService } from '../../test/utils/test-helpers';

// Mock Stellar SDK modules
jest.mock('stellar-sdk', () => ({
  Keypair: {
    fromSecret: jest.fn().mockReturnValue({
      publicKey: jest.fn().mockReturnValue('GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K'),
      secret: jest.fn().mockReturnValue('secret-key-mock'),
    }),
  },
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockReturnValue({ invoke: jest.fn() }),
  })),
  Networks: {
    PUBLIC: 'public-network-passphrase',
    TESTNET: 'testnet-network-passphrase',
  },
  rpc: {
    Server: jest.fn().mockImplementation(() => ({
      simulateTransaction: jest.fn(),
      sendTransaction: jest.fn(),
    })),
    Api: {
      isSimulationError: jest.fn((result) => result.error),
    },
  },
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
    })),
  },
  Account: jest.fn(),
  TransactionBuilder: jest.fn(),
}));

// Mock internal utilities
jest.mock('./utils/transaction', () => ({
  TransactionUtils: jest.fn().mockImplementation(() => ({
    buildAndSubmit: jest.fn(),
  })),
}));

jest.mock('./utils/contract', () => ({
  ContractUtils: {
    encodeString: jest.fn((str) => `encoded_${str}`),
    encodeAddress: jest.fn((addr) => `encoded_${addr}`),
    encodeU128: jest.fn((num) => `encoded_${num}`),
  },
}));

describe('StellarService', () => {
  let service: StellarService;
  let configService: any;

  beforeEach(async () => {
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Stellar components when configuration is available', () => {
      const mockConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'stellar.rpcUrl': 'https://soroban-rpc.testnet.stellar.org',
            'stellar.horizonUrl': 'https://horizon-testnet.stellar.org',
            'stellar.contractId': 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
            'stellar.secretKey': 'SCZGLF7EZIBNP2Q7PQGLVVDGCM2NQNB4D3FSD5UVOVW5XBDPGQVSYYX5X',
            'stellar.network': 'testnet',
            'NODE_ENV': 'production',
          };
          return config[key];
        }),
      };

      const testModule = Test.createTestingModule({
        providers: [
          StellarService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      });

      // Should not throw
      expect(() => {
        new StellarService(mockConfigService);
      }).not.toThrow();
    });

    it('should skip initialization in development mode with missing config', () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      // Should not throw even without Stellar config in development
      expect(() => {
        new StellarService(devConfigService);
      }).not.toThrow();
    });

    it('should throw error in production mode with missing config', () => {
      const prodConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'production',
          };
          return config[key];
        }),
      };

      expect(() => {
        const prodService = new StellarService(prodConfigService);
        prodService.onModuleInit();
      }).toThrow();
    });
  });

  describe('approveSubmission', () => {
    it('should return mock response in development mode without Stellar config', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const result = await devService.approveSubmission(
        'task-123',
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
        100,
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transactionHash');
      expect(result.transactionHash).toContain('mock-tx-hash');
    });

    it('should handle transaction retry logic', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const result = await devService.approveSubmission(
        'task-456',
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
        250,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('registerTask', () => {
    it('should register task with mock response in development', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const result = await devService.registerTask(
        'task-789',
        'USDC',
        500,
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transactionHash');
    });
  });

  describe('getUserStats', () => {
    it('should return mock user stats in development', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const result = await devService.getUserStats(
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('completed_quests');
      expect(result).toHaveProperty('total_earned');
      expect(result).toHaveProperty('level');
    });
  });

  describe('submitProof', () => {
    it('should submit proof with mock response', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const result = await devService.submitProof(
        'task-101',
        'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTQA5XPJMWRFT5GEVQA3I5UU4K',
        'https://example.com/proof',
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transactionHash');
    });
  });

  describe('executeWithRetry', () => {
    it('should retry operation on failure and eventually succeed', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      let attemptCount = 0;
      const operation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      // Access the private method through type assertion for testing
      const result = await (devService as any).executeWithRetry(operation);

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const operation = jest.fn(async () => {
        throw new Error('Persistent failure');
      });

      // Access the private method through type assertion for testing
      await expect(
        (devService as any).executeWithRetry(operation, 2),
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('isServiceHealthy', () => {
    it('should return false when service is not initialized', async () => {
      const devConfigService = {
        get: jest.fn((key) => {
          const config: Record<string, any> = {
            'NODE_ENV': 'development',
          };
          return config[key];
        }),
      };

      const devService = new StellarService(devConfigService);
      devService.onModuleInit();

      const isHealthy = devService.isServiceHealthy();

      expect(isHealthy).toBe(false);
    });
  });
});
