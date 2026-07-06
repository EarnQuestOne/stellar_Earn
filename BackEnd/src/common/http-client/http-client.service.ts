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

const POOL_MAX_SOCKETS = 50;
const POOL_MAX_FREE_SOCKETS = 10;

@Injectable()
export class PooledHttpClientService implements OnModuleDestroy {
  private readonly httpAgent: http.Agent;
  private readonly httpsAgent: https.Agent;
  private readonly instances = new Map<TimeoutBudget, AxiosInstance>();

  constructor() {
    this.httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets: POOL_MAX_SOCKETS,
      maxFreeSockets: POOL_MAX_FREE_SOCKETS,
    });
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets: POOL_MAX_SOCKETS,
      maxFreeSockets: POOL_MAX_FREE_SOCKETS,
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
