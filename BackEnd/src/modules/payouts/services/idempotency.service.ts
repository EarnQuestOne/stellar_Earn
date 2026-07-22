import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { createHash } from 'crypto';
import { IdempotencyKey } from '../entities/idempotency-key.entity';

export interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  responseStatusCode: number | null;
  responseBody: Record<string, unknown> | null;
  locked: boolean;
  completedAt: Date | null;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly repository: Repository<IdempotencyKey>,
  ) {}

  computeFingerprint(
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): string {
    const normalizedPath = path.replace(/\/+$/, '').toLowerCase();
    const normalizedBody = JSON.stringify(body, Object.keys(body).sort());
    const raw = `${method.toUpperCase()}:${normalizedPath}:${normalizedBody}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  computeBodyHash(body: Record<string, unknown>): string {
    const normalized = JSON.stringify(body, Object.keys(body).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  async findByKey(key: string): Promise<IdempotencyKey | null> {
    return this.repository.findOne({
      where: { key, expiresAt: MoreThan(new Date()) },
    });
  }

  async findCompletedByFingerprint(
    fingerprint: string,
  ): Promise<IdempotencyKey | null> {
    return this.repository.findOne({
      where: {
        fingerprint,
        locked: false,
        completedAt: MoreThan(new Date('2020-01-01')),
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async tryAcquire(
    key: string,
    fingerprint: string,
    method: string,
    path: string,
    bodyHash: string,
  ): Promise<{
    acquired: boolean;
    existing?: IdempotencyRecord;
  }> {
    this.logger.debug(`Attempting to acquire idempotency lock: ${key}`);

    try {
      await this.repository.insert({
        key,
        fingerprint,
        requestMethod: method,
        requestPath: path,
        requestBodyHash: bodyHash,
        locked: true,
        expiresAt: new Date(Date.now() + this.ttlMs),
      });

      this.logger.debug(`Idempotency lock acquired: ${key}`);
      return { acquired: true };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        this.logger.debug(`Idempotency lock already held: ${key}`);

        const existing = await this.findByKey(key);

        if (!existing) {
          return { acquired: false };
        }

        if (existing.requestBodyHash && existing.requestBodyHash !== bodyHash) {
          throw new ConflictException(
            'Idempotency key used with a different request body',
          );
        }

        return {
          acquired: false,
          existing: {
            key: existing.key,
            fingerprint: existing.fingerprint,
            responseStatusCode: existing.responseStatusCode,
            responseBody: existing.responseBody,
            locked: existing.locked,
            completedAt: existing.completedAt,
          },
        };
      }

      throw error;
    }
  }

  async complete(
    key: string,
    statusCode: number,

    responseBody: any,
  ): Promise<void> {
    await this.repository.update(
      { key },
      {
        responseStatusCode: statusCode,
        responseBody,
        locked: false,
        completedAt: new Date(),
      },
    );
  }

  async remove(key: string): Promise<void> {
    await this.repository.delete({ key });
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    return result.affected ?? 0;
  }
}
