import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HealthCheckResult, ServiceStatus } from '../types/health.types';

const EXTERNAL_TIMEOUT_MS = 5000;
const EXTERNAL_DEGRADED_THRESHOLD_MS = 1000;

// SendGrid API endpoint to verify API key (simple GET)
const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';

@Injectable()
export class ExternalHealthService implements OnModuleInit {
  private readonly logger = new Logger(ExternalHealthService.name);
  private stellarHorizonUrl: string;
  private sendgridApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.stellarHorizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      this.configService.get<string>('HORIZON_URL') ||
      process.env.STELLAR_HORIZON_URL ||
      process.env.HORIZON_URL ||
      'https://horizon-testnet.stellar.org';
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
  }

  async check(): Promise<HealthCheckResult> {
    // Run both checks in parallel and include results regardless of fulfillment
    const [stellarResult, sendgridResult] = await Promise.allSettled([
      this.checkStellar(),
      this.checkSendGrid(),
    ]);

    const results: HealthCheckResult[] = [
      ...(stellarResult.status === 'fulfilled'
        ? [stellarResult.value]
        : [
            {
              status: 'down' as ServiceStatus,
              latency: 0,
              error: 'Stellar check failed to complete',
            },
          ]),
      ...(sendgridResult.status === 'fulfilled'
        ? [sendgridResult.value]
        : [
            {
              status: 'down' as ServiceStatus,
              latency: 0,
              error: 'SendGrid check failed to complete',
            },
          ]),
    ];

    // Overall status: if any is 'down', external is 'down'; else if any is 'degraded', external is 'degraded'; else 'ok'
    const status = this.aggregateStatus(results);
    const avgLatency =
      results.length > 0
        ? Math.round(
            results.reduce((sum, r) => sum + r.latency, 0) / results.length,
          )
        : 0;

    // Collect errors from down/degraded services
    const errors = results
      .filter((r) => r.status !== 'ok')
      .map((r) => r.error)
      .filter(Boolean);

    return {
      status,
      latency: avgLatency,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  async checkStellar(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(
        `${this.stellarHorizonUrl}/ledgers?order=desc&limit=1`,
        {
          timeout: EXTERNAL_TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const latency = Date.now() - startTime;

      if (response.status !== 200 || !response.data) {
        return {
          status: 'down',
          latency,
          error: `Stellar Horizon returned status ${response.status}`,
        };
      }

      if (latency > EXTERNAL_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(`Stellar Horizon health check slow: ${latency}ms`);
        return {
          status: 'degraded',
          latency,
          error: `Response time ${latency}ms exceeds threshold of ${EXTERNAL_DEGRADED_THRESHOLD_MS}ms`,
        };
      }

      return { status: 'ok', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Stellar Horizon health check failed: ${errorMessage}`);

      return {
        status: 'down',
        latency,
        error: errorMessage,
      };
    }
  }

  private async checkSendGrid(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // If API key is not configured, mark as degraded (not down, since it's optional)
    if (!this.sendgridApiKey) {
      const latency = Date.now() - startTime;
      return {
        status: 'degraded',
        latency,
        error: 'SendGrid API key not configured',
      };
    }

    try {
      const response = await axios.get(`${SENDGRID_API_BASE}/user/credits`, {
        timeout: EXTERNAL_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
        },
      });

      const latency = Date.now() - startTime;

      if (response.status !== 200) {
        return {
          status: 'down',
          latency,
          error: `SendGrid API returned status ${response.status}`,
        };
      }

      if (latency > EXTERNAL_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(`SendGrid API health check slow: ${latency}ms`);
        return {
          status: 'degraded',
          latency,
          error: `Response time ${latency}ms exceeds threshold of ${EXTERNAL_DEGRADED_THRESHOLD_MS}ms`,
        };
      }

      return { status: 'ok', latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`SendGrid API health check failed: ${errorMessage}`);

      return {
        status: 'down',
        latency,
        error: errorMessage,
      };
    }
  }

  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  private aggregateStatus(results: HealthCheckResult[]): ServiceStatus {
    if (results.some((r) => r.status === 'down')) {
      return 'down';
    }
    if (results.some((r) => r.status === 'degraded')) {
      return 'degraded';
    }
    return 'ok';
  }
}
