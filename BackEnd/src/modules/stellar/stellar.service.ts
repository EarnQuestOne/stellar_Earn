// import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import {
//   Keypair,
//   Contract,
//   Networks,
//   rpc,
//   Horizon,
//   Account,
//   TransactionBuilder,
// } from 'stellar-sdk';
// import { TransactionUtils } from './utils/transaction';
// import { ContractUtils } from './utils/contract';

// @Injectable()
// export class StellarService implements OnModuleInit {
//   private readonly logger = new Logger(StellarService.name);
//   private rpcServer: rpc.Server;
//   private horizonServer: Horizon.Server;
//   private contract: Contract;
//   private keypair: Keypair;
//   private txUtils: TransactionUtils;
//   private networkPassphrase: string;

//   constructor(private readonly configService: ConfigService) {}

//   onModuleInit() {
//     this.initializeStellarComponents();
//   }

//   private initializeStellarComponents() {
//     const rpcUrl = this.configService.get<string>('stellar.rpcUrl');
//     const horizonUrl = this.configService.get<string>('stellar.horizonUrl');
//     const contractId = this.configService.get<string>('stellar.contractId');
//     const secretKey = this.configService.get<string>('stellar.secretKey');
//     const network = this.configService.get<string>('stellar.network');
//     const baseFee = this.configService.get<number>('stellar.baseFee', 100);
//     const timeout = this.configService.get<number>('stellar.timeout', 30);

//     if (!rpcUrl || !contractId || !secretKey || !horizonUrl) {
//       const missing: string[] = [];
//       if (!rpcUrl) missing.push('rpcUrl');
//       if (!horizonUrl) missing.push('horizonUrl');
//       if (!contractId) missing.push('contractId');
//       if (!secretKey) missing.push('secretKey');

//       this.logger.error(`Missing Stellar configuration: ${missing.join(', ')}`);
//       throw new Error(`Stellar configuration missing: ${missing.join(', ')}`);
//     }

//     this.rpcServer = new rpc.Server(rpcUrl);
//     this.horizonServer = new Horizon.Server(horizonUrl);
//     this.contract = new Contract(contractId);
//     this.keypair = Keypair.fromSecret(secretKey);
//     this.networkPassphrase =
//       network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

//     this.txUtils = new TransactionUtils(this.rpcServer, this.horizonServer, {
//       fee: baseFee,
//       timeout: timeout,
//       networkPassphrase: this.networkPassphrase,
//     });
//   }

//   async approveSubmission(
//     taskId: string,
//     userAddress: string,
//     amount: number,
//   ): Promise<{ success: boolean; transactionHash: string; result: any }> {
//     return this.executeWithRetry(async () => {
//       const params = [
//         ContractUtils.encodeString(taskId),
//         ContractUtils.encodeAddress(userAddress),
//         ContractUtils.encodeU128(amount),
//       ];

//       const op = this.contract.call('approve', ...params);
//       const txResult = await this.txUtils.buildAndSubmit(this.keypair, op);

//       return {
//         success: true,
//         transactionHash: txResult.hash,
//         result: txResult,
//       };
//     });
//   }

//   async registerTask(
//     taskId: string,
//     rewardAsset: string,
//     amount: number,
//     verifier: string,
//   ): Promise<{ success: boolean; transactionHash: string }> {
//     return this.executeWithRetry(async () => {
//       const params = [
//         ContractUtils.encodeString(taskId),
//         ContractUtils.encodeString(rewardAsset),
//         ContractUtils.encodeU128(amount),
//         ContractUtils.encodeAddress(verifier),
//       ];

//       const op = this.contract.call('register_task', ...params);
//       const txResult = await this.txUtils.buildAndSubmit(this.keypair, op);

//       return {
//         success: true,
//         transactionHash: txResult.hash,
//       };
//     });
//   }

//   async getUserStats(address: string): Promise<any> {
//     try {
//       const params = [ContractUtils.encodeAddress(address)];

//       const sourceKey = this.keypair.publicKey();
//       // Use helper to load account to ensure we get sequence numbers correctly
//       const accountResponse = await this.horizonServer.loadAccount(sourceKey);

//       // Explicitly create an Account object to ensure compatibility with TransactionBuilder
//       const account = new Account(sourceKey, accountResponse.sequence);

//       const transaction = new TransactionBuilder(account, {
//         fee: '100',
//         networkPassphrase: this.networkPassphrase,
//       })
//         .addOperation(this.contract.call('get_user_stats', ...params))
//         .setTimeout(30)
//         .build();

//       const simulated = await this.rpcServer.simulateTransaction(transaction);

//       if (rpc.Api.isSimulationError(simulated)) {
//         throw new Error(`Simulation failed: ${simulated.error}`);
//       }

//       return simulated;
//     } catch (error) {
//       throw error;
//     }
//   }

//   private async executeWithRetry<T>(
//     operation: () => Promise<T>,
//     attempts = 3,
//   ): Promise<T> {
//     let lastError;
//     for (let i = 0; i < attempts; i++) {
//       try {
//         return await operation();
//       } catch (error) {
//         lastError = error;
//         await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
//       }
//     }
//     throw lastError;
//   }
// }

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Keypair,
  Contract,
  Networks,
  rpc,
  Horizon,
  Account,
  TransactionBuilder,
} from 'stellar-sdk';
import { TransactionUtils } from './utils/transaction';
import { ContractUtils } from './utils/contract';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private rpcServer: rpc.Server;
  private horizonServer: Horizon.Server;
  private contract: Contract;
  private keypair: Keypair;
  private txUtils: TransactionUtils;
  private networkPassphrase: string;
  private isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
  }

  onModuleInit() {
    // Skip initialization in development if we don't have proper config
    if (this.isDevelopment) {
      const hasRequiredConfig =
        this.configService.get<string>('stellar.rpcUrl') &&
        this.configService.get<string>('stellar.horizonUrl') &&
        this.configService.get<string>('stellar.contractId') &&
        this.configService.get<string>('stellar.secretKey');

      if (!hasRequiredConfig) {
        this.logger.warn('Skipping Stellar initialization in development mode - missing configuration');
        return;
      }
    }

    this.initializeStellarComponents();
  }

  private initializeStellarComponents() {
    const rpcUrl = this.configService.get<string>('stellar.rpcUrl');
    const horizonUrl = this.configService.get<string>('stellar.horizonUrl');
    const contractId = this.configService.get<string>('stellar.contractId');
    const secretKey = this.configService.get<string>('stellar.secretKey');
    const network = this.configService.get<string>('stellar.network');
    const baseFee = this.configService.get<number>('stellar.baseFee', 100);
    const timeout = this.configService.get<number>('stellar.timeout', 30);

    // In development, use defaults if missing
    if (this.isDevelopment) {
      if (!rpcUrl || !contractId || !secretKey || !horizonUrl) {
        this.logger.warn('Using mock Stellar service in development');
        this.setupMockService();
        return;
      }
    } else {
      // In production, require all config
      if (!rpcUrl || !contractId || !secretKey || !horizonUrl) {
        const missing: string[] = [];
        if (!rpcUrl) missing.push('rpcUrl');
        if (!horizonUrl) missing.push('horizonUrl');
        if (!contractId) missing.push('contractId');
        if (!secretKey) missing.push('secretKey');

        this.logger.error(`Missing Stellar configuration: ${missing.join(', ')}`);
        throw new Error(`Stellar configuration missing: ${missing.join(', ')}`);
      }
    }

    this.rpcServer = new rpc.Server(rpcUrl);
    this.horizonServer = new Horizon.Server(horizonUrl);
    this.contract = new Contract(contractId);
    this.keypair = Keypair.fromSecret(secretKey);
    this.networkPassphrase =
      network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

    this.txUtils = new TransactionUtils(this.rpcServer, this.horizonServer, {
      fee: baseFee,
      timeout: timeout,
      networkPassphrase: this.networkPassphrase,
    });

    this.logger.log('Stellar service initialized');
  }

  private setupMockService() {
    this.logger.log('Stellar service running in mock mode');
    // Create mock objects that won't crash but won't work either
    this.rpcServer = null as any;
    this.horizonServer = null as any;
    this.contract = null as any;
    this.keypair = null as any;
    this.txUtils = null as any;
    this.networkPassphrase = Networks.TESTNET;
  }

  async approveSubmission(
    taskId: string,
    userAddress: string,
    amount: number,
  ): Promise<{ success: boolean; transactionHash: string; result: any }> {
    // Mock response in development if service not initialized
    if (!this.contract && this.isDevelopment) {
      this.logger.warn(`Mocking approveSubmission for task ${taskId}, user ${userAddress}, amount ${amount}`);
      return {
        success: true,
        transactionHash: 'mock-tx-hash-' + Date.now(),
        result: { simulated: true, amount }
      };
    }

    return this.executeWithRetry(async () => {
      const params = [
        ContractUtils.encodeString(taskId),
        ContractUtils.encodeAddress(userAddress),
        ContractUtils.encodeU128(amount),
      ];

      const op = this.contract.call('approve', ...params);
      const txResult = await this.txUtils.buildAndSubmit(this.keypair, op);

      return {
        success: true,
        transactionHash: txResult.hash,
        result: txResult,
      };
    });
  }

  async registerTask(
    taskId: string,
    rewardAsset: string,
    amount: number,
    verifier: string,
  ): Promise<{ success: boolean; transactionHash: string }> {
    // Mock response in development if service not initialized
    if (!this.contract && this.isDevelopment) {
      this.logger.warn(`Mocking registerTask for task ${taskId}, asset ${rewardAsset}, amount ${amount}`);
      return {
        success: true,
        transactionHash: 'mock-tx-hash-' + Date.now(),
      };
    }

    return this.executeWithRetry(async () => {
      const params = [
        ContractUtils.encodeString(taskId),
        ContractUtils.encodeString(rewardAsset),
        ContractUtils.encodeU128(amount),
        ContractUtils.encodeAddress(verifier),
      ];

      const op = this.contract.call('register_task', ...params);
      const txResult = await this.txUtils.buildAndSubmit(this.keypair, op);

      return {
        success: true,
        transactionHash: txResult.hash,
      };
    });
  }

  async getUserStats(address: string): Promise<any> {
    // Mock response in development if service not initialized
    if (!this.rpcServer && this.isDevelopment) {
      this.logger.warn(`Mocking getUserStats for address ${address}`);
      return {
        completed_tasks: 5,
        total_rewards: 1000,
        pending_approvals: 2
      };
    }

    try {
      const params = [ContractUtils.encodeAddress(address)];

      const sourceKey = this.keypair.publicKey();
      const accountResponse = await this.horizonServer.loadAccount(sourceKey);
      const account = new Account(sourceKey, accountResponse.sequence);

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call('get_user_stats', ...params))
        .setTimeout(30)
        .build();

      const simulated = await this.rpcServer.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
      }

      return simulated;
    } catch (error) {
      throw error;
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempts = 3,
  ): Promise<T> {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw lastError;
  }
}
