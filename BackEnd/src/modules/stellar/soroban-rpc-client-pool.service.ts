import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rpc } from 'stellar-sdk';
import * as StellarSdk from 'stellar-sdk';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class SorobanRpcClientPoolService implements OnModuleInit {
  private readonly logger = new Logger(SorobanRpcClientPoolService.name);
  private rpcServer: rpc.Server;
  private horizonServer: StellarSdk.Horizon.Server;
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializePool();
  }

  private initializePool() {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      'https://horizon-testnet.stellar.org';

    const timeoutMs = parseInt(
      this.configService.get<string>('SOROBAN_RPC_TIMEOUT_MS') || '15000',
      10,
    );
    const maxSockets = parseInt(
      this.configService.get<string>('SOROBAN_RPC_MAX_SOCKETS') || '50',
      10,
    );

    this.httpAgent = new http.Agent({
      keepAlive: true,
      maxSockets,
      timeout: timeoutMs,
    });

    this.httpsAgent = new https.Agent({
      keepAlive: true,
      maxSockets,
      timeout: timeoutMs,
    });

    const isHttp = rpcUrl.startsWith('http://');

    this.rpcServer = new rpc.Server(rpcUrl, {
      allowHttp: isHttp,
      headers: {
        'Keep-Alive': `timeout=${Math.floor(timeoutMs / 1000)}, max=1000`,
      },
    });

    this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl, {
      allowHttp: horizonUrl.startsWith('http://'),
    });

    this.logger.log(
      `Soroban RPC & Horizon Client Pool initialized with keep-alive (maxSockets=${maxSockets}, timeout=${timeoutMs}ms)`,
    );
  }

  getRpcServer(): rpc.Server {
    if (!this.rpcServer) {
      this.initializePool();
    }
    return this.rpcServer;
  }

  getHorizonServer(): StellarSdk.Horizon.Server {
    if (!this.horizonServer) {
      this.initializePool();
    }
    return this.horizonServer;
  }

  getPoolMetrics() {
    return {
      httpMaxSockets: (this.httpAgent as any)?.maxSockets ?? 50,
      httpsMaxSockets: (this.httpsAgent as any)?.maxSockets ?? 50,
      reused: true,
    };
  }
}
