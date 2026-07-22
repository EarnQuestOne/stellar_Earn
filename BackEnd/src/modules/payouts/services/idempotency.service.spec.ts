import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyKey } from '../entities/idempotency-key.entity';

const mockKey = 'test-key-123';
const mockFingerprint =
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';

const buildIdempotencyKey = (
  overrides: Partial<IdempotencyKey> = {},
): IdempotencyKey =>
  ({
    id: 'key-uuid-1',
    key: mockKey,
    fingerprint: mockFingerprint,
    requestMethod: 'POST',
    requestPath: '/payouts/claim',
    requestBodyHash: 'body-hash-123',
    responseStatusCode: null,
    responseBody: null,
    locked: false,
    completedAt: null,
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as IdempotencyKey;

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let repo: jest.Mocked<Repository<IdempotencyKey>>;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: getRepositoryToken(IdempotencyKey),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
    repo = module.get(getRepositoryToken(IdempotencyKey));
  });

  afterEach(() => jest.restoreAllMocks());

  describe('computeFingerprint', () => {
    it('should produce a deterministic SHA-256 fingerprint', () => {
      const fp1 = service.computeFingerprint('POST', '/payouts/claim', {
        submissionId: 'abc',
        stellarAddress: 'G123',
      });
      const fp2 = service.computeFingerprint('POST', '/payouts/claim', {
        submissionId: 'abc',
        stellarAddress: 'G123',
      });

      expect(fp1).toEqual(fp2);
      expect(fp1).toHaveLength(64);
    });

    it('should produce different fingerprints for different payloads', () => {
      const fp1 = service.computeFingerprint('POST', '/payouts/claim', {
        submissionId: 'abc',
        stellarAddress: 'G123',
      });
      const fp2 = service.computeFingerprint('POST', '/payouts/claim', {
        submissionId: 'xyz',
        stellarAddress: 'G123',
      });

      expect(fp1).not.toEqual(fp2);
    });

    it('should normalize trailing slashes in path', () => {
      const fp1 = service.computeFingerprint('POST', '/payouts/claim/', {
        submissionId: 'abc',
        stellarAddress: 'G123',
      });
      const fp2 = service.computeFingerprint('POST', '/payouts/claim', {
        submissionId: 'abc',
        stellarAddress: 'G123',
      });

      expect(fp1).toEqual(fp2);
    });
  });

  describe('computeBodyHash', () => {
    it('should produce a deterministic hash', () => {
      const h1 = service.computeBodyHash({ a: 1, b: 2 });
      const h2 = service.computeBodyHash({ b: 2, a: 1 });

      expect(h1).toEqual(h2);
      expect(h1).toHaveLength(64);
    });
  });

  describe('findByKey', () => {
    it('should return null when key does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findByKey('nonexistent');
      expect(result).toBeNull();
    });

    it('should return key record when found', async () => {
      const record = buildIdempotencyKey();
      repo.findOne.mockResolvedValue(record);

      const result = await service.findByKey(mockKey);
      expect(result).toEqual(record);
    });
  });

  describe('findCompletedByFingerprint', () => {
    it('should return null when fingerprint not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.findCompletedByFingerprint(mockFingerprint);
      expect(result).toBeNull();
    });

    it('should return completed record when found', async () => {
      const record = buildIdempotencyKey({
        locked: false,
        completedAt: new Date(),
        responseStatusCode: 200,
        responseBody: { status: 'completed' },
      });
      repo.findOne.mockResolvedValue(record);

      const result = await service.findCompletedByFingerprint(mockFingerprint);
      expect(result).toEqual(record);
    });
  });

  describe('tryAcquire', () => {
    it('should acquire the lock on first attempt', async () => {
      repo.insert.mockResolvedValue({ identifiers: [], generatedMaps: [] });

      const result = await service.tryAcquire(
        mockKey,
        mockFingerprint,
        'POST',
        '/payouts/claim',
        'body-hash-123',
      );

      expect(result.acquired).toBe(true);
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ key: mockKey, locked: true }),
      );
    });

    it('should return existing record on duplicate key', async () => {
      const existing = buildIdempotencyKey({
        locked: false,
        responseStatusCode: 200,
        responseBody: { id: 'payout-1' },
        completedAt: new Date(),
      });

      const insertError = new Error('duplicate key');
      (insertError as any).code = '23505';
      repo.insert.mockRejectedValue(insertError);
      repo.findOne.mockResolvedValue(existing);

      const result = await service.tryAcquire(
        mockKey,
        mockFingerprint,
        'POST',
        '/payouts/claim',
        'body-hash-123',
      );

      expect(result.acquired).toBe(false);
      expect(result.existing).toBeDefined();
      expect(result.existing!.responseStatusCode).toBe(200);
    });

    it('should throw ConflictException on body hash mismatch', async () => {
      const existing = buildIdempotencyKey({
        requestBodyHash: 'different-body-hash',
        locked: false,
      });

      const insertError = new Error('duplicate key');
      (insertError as any).code = '23505';
      repo.insert.mockRejectedValue(insertError);
      repo.findOne.mockResolvedValue(existing);

      await expect(
        service.tryAcquire(
          mockKey,
          mockFingerprint,
          'POST',
          '/payouts/claim',
          'new-body-hash',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('complete', () => {
    it('should update the record with response data', async () => {
      repo.update.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.complete(mockKey, 200, { id: 'payout-1' });

      expect(repo.update).toHaveBeenCalledWith(
        { key: mockKey },
        expect.objectContaining({
          responseStatusCode: 200,
          responseBody: { id: 'payout-1' },
          locked: false,
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete the record by key', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.remove(mockKey);

      expect(repo.delete).toHaveBeenCalledWith({ key: mockKey });
    });
  });

  describe('cleanupExpired', () => {
    it('should delete expired records and return count', async () => {
      const count = await service.cleanupExpired();
      expect(count).toBe(5);
    });
  });
});
