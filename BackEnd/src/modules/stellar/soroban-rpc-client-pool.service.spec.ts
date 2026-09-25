import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SorobanRpcClientPoolService } from './soroban-rpc-client-pool.service';

describe('SorobanRpcClientPoolService', () => {
  let service: SorobanRpcClientPoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanRpcClientPoolService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SOROBAN_RPC_URL')
                return 'https://soroban-testnet.stellar.org';
              if (key === 'STELLAR_HORIZON_URL')
                return 'https://horizon-testnet.stellar.org';
              if (key === 'SOROBAN_RPC_TIMEOUT_MS') return '15000';
              if (key === 'SOROBAN_RPC_MAX_SOCKETS') return '50';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SorobanRpcClientPoolService>(
      SorobanRpcClientPoolService,
    );
    service.onModuleInit();
  });

  it('provides singleton instance of rpc.Server and Horizon.Server', () => {
    const rpc1 = service.getRpcServer();
    const rpc2 = service.getRpcServer();
    expect(rpc1).toBe(rpc2);

    const horizon1 = service.getHorizonServer();
    const horizon2 = service.getHorizonServer();
    expect(horizon1).toBe(horizon2);
  });

  it('exposes pool metrics', () => {
    const metrics = service.getPoolMetrics();
    expect(metrics.reused).toBe(true);
    expect(metrics.httpMaxSockets).toBe(50);
  });
});
