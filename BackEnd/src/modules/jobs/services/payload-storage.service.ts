import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';

const PAYLOAD_KEY_PREFIX = 'job_payload:';
const PAYLOAD_REF_MARKER = '__payloadRef';
const PAYLOAD_TTL_SECONDS = 86400; // 24 hours
const PAYLOAD_SIZE_THRESHOLD = 51200; // 50 KB

export interface PayloadRef {
  [PAYLOAD_REF_MARKER]: string;
}

@Injectable()
export class PayloadStorageService {
  private readonly logger = new Logger(PayloadStorageService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Returns true if `data` exceeds the size threshold and should be offloaded.
   */
  shouldOffload(data: unknown): boolean {
    if (data === null || data === undefined) return false;
    try {
      const bytes = Buffer.byteLength(JSON.stringify(data), 'utf-8');
      return bytes > PAYLOAD_SIZE_THRESHOLD;
    } catch {
      return false;
    }
  }

  /**
   * Store the full payload in cache and return a reference key.
   * The reference can be embedded in the BullMQ job data alongside the
   * lightweight metadata.
   */
  async storePayload(jobId: string, payload: unknown): Promise<string> {
    const key = `${PAYLOAD_KEY_PREFIX}${jobId}`;
    await this.cacheService.set(key, payload, PAYLOAD_TTL_SECONDS);
    this.logger.debug(
      `Offloaded payload for job ${jobId} (${Buffer.byteLength(JSON.stringify(payload), 'utf-8')} bytes)`,
    );
    return key;
  }

  /**
   * Retrieve the full payload from cache using the reference key.
   * Returns undefined if not found or expired.
   */
  async retrievePayload<T = unknown>(jobId: string): Promise<T | undefined> {
    const key = `${PAYLOAD_KEY_PREFIX}${jobId}`;
    return this.cacheService.get<T>(key);
  }

  /**
   * Retrieve payload using an explicit key (useful when the reference is
   * stored as a string in job data).
   */
  async retrievePayloadByKey<T = unknown>(key: string): Promise<T | undefined> {
    return this.cacheService.get<T>(key);
  }

  /**
   * Remove the stored payload from cache (e.g. after job completion).
   */
  async evictPayload(jobId: string): Promise<void> {
    const key = `${PAYLOAD_KEY_PREFIX}${jobId}`;
    await this.cacheService.del(key);
  }

  /**
   * Build a lightweight reference object that can replace the original data
   * in the BullMQ job, keeping only essential metadata fields.
   */
  buildLightweightData(
    data: Record<string, any>,
    jobId: string,
    payloadRef: string,
  ): Record<string, any> {
    const { __trace, __jobType, __sourceQueue, ...rest } = data;
    const metaOnly: Record<string, any> = {};

    // Preserve internal routing fields
    if (__trace) metaOnly.__trace = __trace;
    if (__jobType) metaOnly.__jobType = __jobType;
    if (__sourceQueue) metaOnly.__sourceQueue = __sourceQueue;

    // Preserve lightweight identifier fields from rest
    for (const [key, value] of Object.entries(rest)) {
      if (typeof value !== 'object' || value === null) {
        metaOnly[key] = value;
      }
    }

    metaOnly[PAYLOAD_REF_MARKER] = payloadRef;
    return metaOnly;
  }

  /**
   * Check if job data contains a payload reference.
   */
  hasPayloadRef(data: Record<string, any>): boolean {
    return PAYLOAD_REF_MARKER in data;
  }

  /**
   * Get the payload ref key from job data.
   */
  getPayloadRefKey(data: Record<string, any>): string | undefined {
    return data[PAYLOAD_REF_MARKER] as string | undefined;
  }
}
