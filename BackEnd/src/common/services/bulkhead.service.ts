import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

interface BulkheadOptions {
  maxConcurrent: number;
  maxQueueSize: number;
}

interface QueuedTask<T> {
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

@Injectable()
export class BulkheadService {
  private readonly logger = new Logger(BulkheadService.name);
  private readonly state = new Map<string, { running: number; queue: QueuedTask<any>[] }>();

  async runWithBulkhead<T>(
    key: string,
    operation: () => Promise<T>,
    options: BulkheadOptions,
  ): Promise<T> {
    const state = this.getOrCreateState(key);

    if (state.running >= options.maxConcurrent) {
      if (state.queue.length >= options.maxQueueSize) {
        this.logger.warn(
          `Bulkhead queue for ${key} is full. Rejecting request.`,
        );
        throw new ServiceUnavailableException(
          `Bulkhead limit exceeded for ${key}`,
        );
      }

      return new Promise<T>((resolve, reject) => {
        state.queue.push({ run: operation, resolve, reject });
      });
    }

    state.running += 1;

    try {
      return await operation();
    } finally {
      state.running -= 1;
      this.drainQueue(key, options);
    }
  }

  private getOrCreateState(key: string) {
    let entry = this.state.get(key);
    if (!entry) {
      entry = { running: 0, queue: [] };
      this.state.set(key, entry);
    }
    return entry;
  }

  private async drainQueue(key: string, options: BulkheadOptions): Promise<void> {
    const state = this.getOrCreateState(key);
    while (state.running < options.maxConcurrent && state.queue.length > 0) {
      const next = state.queue.shift();
      if (!next) {
        break;
      }

      state.running += 1;
      try {
        const result = await next.run();
        next.resolve(result);
      } catch (error) {
        next.reject(error);
      } finally {
        state.running -= 1;
      }
    }
  }
}
