import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HealthCheckResult, ServiceStatus } from '../types/health.types';

const EXTERNAL_TIMEOUT_MS = 5000;
const EXTERNAL_DEGRADED_THRESHOLD_MS = 1000;

// Soroban RPC method for getInfo (lightweight, doesn't require contract)
const STELLAR_RPC_GET_INFO = {
  jsonrpc: '2.0',
  id: 1,
  method: 'getNetwork',
  params: [],
};

// SendGrid API endpoint to verify API key (simple GET)
const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';

@Injectable()
export class ExternalHealthService implements OnModuleInit {
  private readonly logger = new Logger(ExternalHealthService.name);
  private stellarRpcUrl: string;
  private sendgridApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Read directly from environment variables for independence from feature modules
    this.stellarRpcUrl = 
      process.env.SOROBAN_RPC_URL || 
      'https://soroban-testnet.stellar.org';
    this.sendgridApiKey = process.env.SENDGRID_API_KEY;
  }

  async check(): Promise<HealthCheckResult> {
    // Run both checks in parallel and include results regardless of fulfillment
    const [stellarResult, sendgridResult] = await Promise.allSettled([
      this.checkStellar(),
      this.checkSendGrid(),
    ]);

    const results: HealthCheckResult[] = [
      ...(stellarResult.status === 'fulfilled' ? [stellarResult.value] : [{
        status: 'down' as ServiceStatus,
        latency: 0,
        error: 'Stellar check failed to complete',
      }]),
      ...(sendgridResult.status === 'fulfilled' ? [sendgridResult.value] : [{
        status: 'down' as ServiceStatus,
        latency: 0,
        error: 'SendGrid check failed to complete',
      }]),
    ];

    // Overall status: if any is 'down', external is 'down'; else if any is 'degraded', external is 'degraded'; else 'ok'
    const status = this.aggregateStatus(results);
    const avgLatency = results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.latency, 0) / results.length)
      : 0;

    // Collect errors from down/degraded services
    const errors = results
      .filter(r => r.status !== 'ok')
      .map(r => r.error)
      .filter(Boolean);

    return {
      status,
      latency: avgLatency,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  private async checkStellar(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        this.stellarRpcUrl,
        STELLAR_RPC_GET_INFO,
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
          error: `Stellar RPC returned status ${response.status}`,
        };
      }

      if (latency > EXTERNAL_DEGRADED_THRESHOLD_MS) {
        this.logger.warn(`Stellar RPC health check slow: ${latency}ms`);
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
      this.logger.error(`Stellar RPC health check failed: ${errorMessage}`);
      
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
    if (results.some(r => r.status === 'down')) {
      return 'down';
    }
    if (results.some(r => r.status === 'degraded')) {
      return 'degraded';
    }
    return 'ok';
  }
}
