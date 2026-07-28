import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MetricsService } from './metrics.service'

export interface RetryOptions {
  maxAttempts: number
  backoffBaseMs: number
  backoffMaxMs: number
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  backoffBaseMs: 1_000,
  backoffMaxMs: 30_000,
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>,
  ): Promise<T> {
    const opts = this.resolveOptions(options)
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        this.metrics.incrementCounter('stellar_retry_attempts_total', {
          attempt: String(attempt),
          max_attempts: String(opts.maxAttempts),
        })

        if (attempt < opts.maxAttempts) {
          const delay = this.backoffDelay(attempt, opts)
          this.logger.warn(
            `Attempt ${attempt}/${opts.maxAttempts} failed: ${(error as Error).message}. ` +
              `Retrying in ${delay}ms...`,
          )
          await this.sleep(delay)
        }
      }
    }

    this.metrics.incrementCounter('stellar_retry_exhausted_total', {
      max_attempts: String(opts.maxAttempts),
    })
    throw lastError
  }

  private backoffDelay(attempt: number, opts: RetryOptions): number {
    const exponential = opts.backoffBaseMs * Math.pow(2, attempt - 1)
    return Math.min(exponential, opts.backoffMaxMs)
  }

  private resolveOptions(overrides?: Partial<RetryOptions>): RetryOptions {
    const stellarRetryMax = parseInt(this.configService.get('STELLAR_RETRY_MAX') ?? '', 10)
    const stellarRetryBackoff = parseInt(this.configService.get('STELLAR_RETRY_BACKOFF') ?? '', 10)

    return {
      maxAttempts:
        overrides?.maxAttempts ?? (Number.isFinite(stellarRetryMax) ? stellarRetryMax : DEFAULT_OPTIONS.maxAttempts),
      backoffBaseMs:
        overrides?.backoffBaseMs ?? (Number.isFinite(stellarRetryBackoff) ? stellarRetryBackoff : DEFAULT_OPTIONS.backoffBaseMs),
      backoffMaxMs:
        overrides?.backoffMaxMs ?? DEFAULT_OPTIONS.backoffMaxMs,
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
