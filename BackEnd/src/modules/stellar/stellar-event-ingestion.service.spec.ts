import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StellarEventIngestionService } from './stellar-event-ingestion.service';
import { StellarService } from './stellar.service';
import { EventStore } from '../../events/entities/event-store.entity';

describe('StellarEventIngestionService', () => {
  let service: StellarEventIngestionService;
  let mockRpc: any;
  let mockStellarService: any;
  let eventStoreRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'CONTRACT_ID') return 'C_CONTRACT';
      if (key === 'STELLAR_EVENT_STREAMING_ENABLED') return 'true';
      if (key === 'STELLAR_EVENT_PAGE_SIZE') return '200';
      return null;
    }),
  };

  beforeEach(async () => {
    mockRpc = {
      getLatestLedger: jest.fn(),
      getEvents: jest.fn(),
    };
    mockStellarService = {
      getRpc: jest.fn().mockReturnValue(mockRpc),
    };

    eventStoreRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
      create: jest.fn().mockImplementation((value) => value),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarEventIngestionService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: StellarService, useValue: mockStellarService },
        {
          provide: getRepositoryToken(EventStore),
          useValue: eventStoreRepository,
        },
      ],
    }).compile();

    service = module.get<StellarEventIngestionService>(
      StellarEventIngestionService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('ingests contract events into the event store with deduplication metadata', async () => {
    mockRpc.getLatestLedger.mockResolvedValue({
      sequence: 100,
    } as any);
    mockRpc.getEvents.mockResolvedValue({
      events: [
        {
          id: 'evt-1',
          topic: ['submission.approved'],
          value: { submissionId: 'sub-1', verifierId: 'verifier-1' },
          transactionHash: 'hash-1',
          ledger: 96,
          ledgerClosedAt: '2026-01-01T00:00:00.000Z',
          inSuccessfulContractCall: true,
          transactionIndex: 0,
          operationIndex: 0,
        },
      ],
    } as any);

    await service.ingestContractEvents();

    expect(mockRpc.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        startLedger: 45,
        endLedger: 95,
      }),
    );
    expect(eventStoreRepository.findOne).toHaveBeenCalledWith({
      where: { sourceId: 'evt-1' },
    });
    expect(eventStoreRepository.save).toHaveBeenCalledTimes(1);
    expect(eventStoreRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'stellar.contract.event.submission.approved',
        source: 'stellar.contract',
        sourceId: 'evt-1',
        contractId: 'C_CONTRACT',
        transactionHash: 'hash-1',
        ledger: 96,
      }),
    );
  });

  it('does nothing when event streaming is disabled', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'STELLAR_EVENT_STREAMING_ENABLED') return 'false';
      if (key === 'CONTRACT_ID') return 'C_CONTRACT';
      return null;
    });

    await service.ingestContractEvents();

    expect(mockRpc.getLatestLedger).not.toHaveBeenCalled();
    expect(mockRpc.getEvents).not.toHaveBeenCalled();
  });

  it('does nothing when CONTRACT_ID is not configured', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'STELLAR_EVENT_STREAMING_ENABLED') return 'true';
      if (key === 'CONTRACT_ID') return '';
      return null;
    });

    await service.ingestContractEvents();

    expect(mockRpc.getLatestLedger).not.toHaveBeenCalled();
  });

  it('skips duplicate events already in the event store', async () => {
    mockRpc.getLatestLedger.mockResolvedValue({
      sequence: 100,
    } as any);
    mockRpc.getEvents.mockResolvedValue({
      events: [
        {
          id: 'evt-duplicate',
          topic: ['duplicate.event'],
          value: {},
          ledger: 96,
        },
      ],
    } as any);

    eventStoreRepository.findOne.mockResolvedValue({ id: 'existing' });

    await service.ingestContractEvents();

    // Event was found as existing, so save should NOT be called for it
    expect(eventStoreRepository.save).not.toHaveBeenCalled();
  });
});
