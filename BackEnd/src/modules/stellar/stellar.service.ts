/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import {
  Keypair,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  Address,
  rpc,
} from 'stellar-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: rpc.Server;
  private contract: Contract;
  private keypair: Keypair;
  private networkPassphrase: string;

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('SOROBAN_RPC_URL');
    const contractId = this.configService.get<string>('CONTRACT_ID');
    const secretKey = this.configService.get<string>('SOROBAN_SECRET_KEY');
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    if (!rpcUrl) {
      throw new Error('SOROBAN_RPC_URL is not configured');
    }
    if (!contractId) {
      throw new Error('CONTRACT_ID is not configured');
    }
    if (!secretKey) {
      throw new Error('SOROBAN_SECRET_KEY is not configured');
    }

    this.server = new rpc.Server(rpcUrl);
    this.contract = new Contract(contractId);
    this.keypair = Keypair.fromSecret(secretKey);

    this.networkPassphrase =
      network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

    this.logger.log(`Stellar Service initialized for ${network}`);
  }

  /**
   * Approve submission and trigger on-chain reward distribution
   */
  async approveSubmission(
    taskId: string,
    userAddress: string,
    amount: number,
  ): Promise<{
    success: boolean;
    transactionHash: string;
    result: rpc.Api.GetTransactionResponse;
  }> {
    try {
      this.logger.log(
        `Approving submission for task ${taskId}, user ${userAddress}, amount ${amount}`,
      );

      // Get account details
      const sourceAccount = await this.server.getAccount(
        this.keypair.publicKey(),
      );

      const params = [
        nativeToScVal(taskId, { type: 'string' }),
        new Address(userAddress).toScVal(),
        nativeToScVal(amount, { type: 'u128' }),
      ];

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call('approve', ...params))
        .setTimeout(30)
        .build();

      const simulatedTx = await this.server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulatedTx)) {
        throw new Error(`Simulation failed: ${simulatedTx.error}`);
      }

      const preparedTx = rpc
        .assembleTransaction(transaction, simulatedTx)
        .build();

      preparedTx.sign(this.keypair);

      const result = await this.server.sendTransaction(preparedTx);

      this.logger.log(`Transaction submitted: ${result.hash}`);

      const txResult = await this.waitForTransaction(result.hash as string);

      this.logger.log(
        `Approval confirmed for task ${taskId}, tx: ${result.hash}`,
      );

      return {
        success: true,
        transactionHash: result.hash,
        result: txResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to approve submission: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Register a new task on-chain
   */
  async registerTask(
    taskId: string,
    rewardAsset: string,
    amount: number,
    verifier: string,
  ): Promise<{
    success: boolean;
    transactionHash: string;
  }> {
    try {
      this.logger.log(`Registering task ${taskId} on-chain`);

      const sourceAccount = await this.server.getAccount(
        this.keypair.publicKey(),
      );

      const params = [
        nativeToScVal(taskId, { type: 'string' }),
        nativeToScVal(rewardAsset, { type: 'string' }),
        nativeToScVal(amount, { type: 'u128' }),
        new Address(verifier).toScVal(),
      ];

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call('register_task', ...params))
        .setTimeout(30)
        .build();

      const simulatedTx = await this.server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulatedTx)) {
        throw new Error(`Simulation failed: ${simulatedTx.error}`);
      }

      const preparedTx = rpc
        .assembleTransaction(transaction, simulatedTx)
        .build();

      preparedTx.sign(this.keypair);

      const result = await this.server.sendTransaction(preparedTx);
      await this.waitForTransaction(result.hash as string);

      this.logger.log(`Task ${taskId} registered, tx: ${result.hash}`);

      return {
        success: true,
        transactionHash: result.hash,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to register task: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get user statistics from the contract
   */
  async getUserStats(
    address: string,
  ): Promise<rpc.Api.SimulateTransactionResponse> {
    try {
      const params = [new Address(address).toScVal()];

      const sourceAccount = await this.server.getAccount(
        this.keypair.publicKey(),
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call('get_user_stats', ...params))
        .setTimeout(30)
        .build();

      const simulatedTx = await this.server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulatedTx)) {
        throw new Error(`Simulation failed: ${simulatedTx.error}`);
      }

      return simulatedTx;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to get user stats: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(
    hash: string,
    timeout = 60000,
  ): Promise<rpc.Api.GetTransactionResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const txResult = await this.server.getTransaction(hash);

        if (txResult.status === 'SUCCESS') {
          return txResult;
        }

        if (txResult.status === 'FAILED') {
          throw new Error(`Transaction failed: ${JSON.stringify(txResult)}`);
        }
      } catch {
        // Transaction not found yet, continue polling
        // This is expected behavior, so we don't log it
      }

      // Wait 1 second before next poll
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
  }
}
