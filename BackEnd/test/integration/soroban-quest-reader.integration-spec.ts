import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { nativeToScVal, StrKey } from 'stellar-sdk';
import { randomBytes } from 'crypto';
import { TracingService } from '../../src/common/tracing/tracing.service';
import { MetricsService } from '../../src/common/services/metrics.service';
import { SorobanQuestReaderService } from '../../src/modules/stellar/soroban-quest-reader.service';

describe('SorobanQuestReaderService (integration)', () => {
  let module: TestingModule;
  let service: SorobanQuestReaderService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SorobanQuestReaderService,
        {
          provide: TracingService,
          useValue: {
            extractContext: jest.fn(),
            startSpan: jest.fn(),
            endSpan: jest.fn(),
            inject: jest.fn(),
            trace: jest.fn((_name: string, fn: (span: any) => any) =>
              fn({
                attributes: {},
                status: undefined,
                setAttribute: jest.fn(),
                setStatus: jest.fn(),
              }),
            ),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            registerCounter: jest.fn(),
            registerGauge: jest.fn(),
            registerHistogram: jest.fn(),
            incrementCounter: jest.fn(),
            observeHistogram: jest.fn(),
            increment: jest.fn(),
            gauge: jest.fn(),
            histogram: jest.fn(),
            getMetrics: jest.fn(),
            getMetricsJson: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SOROBAN_RPC_URL')
                return 'https://soroban-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              if (key === 'SOROBAN_SIM_SOURCE_ACCOUNT')
                return 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SorobanQuestReaderService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('decodes quest state from simulated contract return value', async () => {
    // Patch the underlying rpc server call to avoid network usage.
    const rpcServer = (service as any).rpcServer;
    jest.spyOn(rpcServer, 'simulateTransaction').mockResolvedValue({
      transactionData: 'AAAA',
      result: {
        retval: nativeToScVal({
          id: 'QUEST_1',
          creator: 'GCREATOR',
          reward_asset: 'CREWARD',
          reward_amount: 100n,
          verifier: 'GVERIFY',
          deadline: 1893456000n,
          status: 'Active',
          total_claims: 7,
        }),
        auth: [],
      },
    });

    const contractId = StrKey.encodeContract(randomBytes(32));
    const quest = await service.getQuest(contractId, 'QUEST_1');
    expect(quest).toEqual({
      id: 'QUEST_1',
      creator: 'GCREATOR',
      reward_asset: 'CREWARD',
      reward_amount: 100n,
      verifier: 'GVERIFY',
      deadline: 1893456000n,
      status: 'Active',
      total_claims: 7,
    });
  });
});
