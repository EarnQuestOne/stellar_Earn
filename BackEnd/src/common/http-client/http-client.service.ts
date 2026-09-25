import { Injectable, OnModuleDestroy } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as http from 'http';
import * as https from 'https';

export const TIMEOUT_BUDGETS = {
  short: 3_000,
  medium: 8_000,
  long: 15_000,
} as const;

export type TimeoutBudget = keyof typeof TIMEOUT_BUDGETS;

const POOL_MAX_SOCKETS = 100;
const POOL_MAX_FREE_SOCKETS = 20;

@Injectable()
export class PooledHttpClientService implements OnModuleDestroy {
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;
  private readonly instances = new Map<TimeoutBudget, AxiosInstance>();

  constructor() {
    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30_000,
      maxSockets: POOL_MAX_SOCKETS,
      maxFreeSockets: POOL_MAX_FREE_SOCKETS,
      family: 4, // Force IPv4 to avoid happy-eyeballs delay
    });
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30_000,
      maxSockets: POOL_MAX_SOCKETS,
      maxFreeSockets: POOL_MAX_FREE_SOCKETS,
      family: 4,
    });

    for (const budget of Object.keys(TIMEOUT_BUDGETS) as TimeoutBudget[]) {
      this.instances.set(
        budget,
        axios.create({
          timeout: TIMEOUT_BUDGETS[budget],
          httpAgent: this.httpAgent,
          httpsAgent: this.httpsAgent,
        }),
      );
    }
  }

  /** Returns a shared, pre-configured Axios instance for the given timeout budget. */
  create(budget: TimeoutBudget): AxiosInstance {
    return this.instances.get(budget)!;
  }

  onModuleDestroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}
