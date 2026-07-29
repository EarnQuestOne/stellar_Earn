import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'http';

/**
 * Tracks in-flight HTTP requests and provides coordinated graceful shutdown.
 * Issue #2030: Graceful shutdown draining for in-flight requests and jobs.
 */
@Injectable()
export class GracefulShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private inflightCount = 0;
  private isDraining = false;
  private drainResolvers: Array<() => void> = [];
  private readonly drainTimeoutMs: number;

  constructor() {
    this.drainTimeoutMs = parseInt(
      process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || '30000',
      10,
    );
  }

  /**
   * Express middleware that tracks in-flight requests.
   * During drain, rejects new requests with 503.
   */
  middleware() {
    return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (this.isDraining) {
        res.writeHead(503, {
          'Content-Type': 'application/json',
          'Retry-After': '5',
          Connection: 'close',
        });
        res.end(
          JSON.stringify({
            statusCode: 503,
            message: 'Server is shutting down, please retry',
          }),
        );
        return;
      }

      this.inflightCount++;
      this.logger.debug(
        `Request in-flight: ${this.inflightCount} active`,
        'GracefulShutdown',
      );

      const finish = () => {
        this.inflightCount--;
        this.logger.debug(
          `Request completed: ${this.inflightCount} active`,
          'GracefulShutdown',
        );

        if (this.isDraining && this.inflightCount <= 0) {
          this.resolveDrain();
        }
      };

      res.on('finish', finish);
      res.on('close', finish);

      next();
    };
  }

  /**
   * Initiate drain: stop accepting new requests, wait for in-flight to finish.
   * Returns when all in-flight requests complete or timeout is reached.
   */
  async drain(): Promise<void> {
    this.isDraining = true;
    this.logger.log(
      `Draining ${this.inflightCount} in-flight request(s) (timeout: ${this.drainTimeoutMs}ms)`,
      'GracefulShutdown',
    );

    if (this.inflightCount <= 0) {
      this.logger.log(
        'No in-flight requests, drain complete',
        'GracefulShutdown',
      );
      return;
    }

    return new Promise<void>((resolve) => {
      this.drainResolvers.push(resolve);

      setTimeout(() => {
        this.logger.warn(
          `Drain timeout reached with ${this.inflightCount} request(s) still in-flight`,
          'GracefulShutdown',
        );
        this.resolveDrain();
      }, this.drainTimeoutMs);
    });
  }

  private resolveDrain(): void {
    const resolvers = this.drainResolvers.splice(0);
    for (const resolve of resolvers) {
      resolve();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.inflightCount > 0) {
      this.logger.log(
        `Module destroying: waiting for ${this.inflightCount} in-flight request(s)`,
        'GracefulShutdown',
      );
      await this.drain();
    }
  }

  getInflightCount(): number {
    return this.inflightCount;
  }

  getIsDraining(): boolean {
    return this.isDraining;
  }
}
