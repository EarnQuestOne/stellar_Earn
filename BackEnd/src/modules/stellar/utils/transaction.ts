import {
  Keypair,
  TransactionBuilder,
  rpc,
  Transaction,
  Horizon,
  Account,
} from 'stellar-sdk';
import { Logger } from '@nestjs/common';

export interface TransactionConfig {
  fee: number;
  timeout: number;
  networkPassphrase: string;
}

export class TransactionUtils {
  private readonly logger = new Logger(TransactionUtils.name);

  constructor(
    private readonly rpcServer: rpc.Server,
    private readonly horizonServer: Horizon.Server,
    private readonly config: TransactionConfig,
  ) {}

  async buildAndSubmit(
    signer: Keypair,
    operation: any,
    simulate = true,
  ): Promise<{ hash: string; result: rpc.Api.GetTransactionResponse }> {
    try {
      // Use Horizon to fetch the current account state (sequence number)
      const sourceKey = signer.publicKey();
      const accountResponse = await this.horizonServer.loadAccount(sourceKey);

      // Explicitly create Account object to ensure compatibility
      const account = new Account(sourceKey, accountResponse.sequence);

      const transaction = new TransactionBuilder(account, {
        fee: this.config.fee.toString(),
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(this.config.timeout)
        .build();

      let hash: string;
      let result: rpc.Api.GetTransactionResponse;

      if (simulate) {
        // Use Soroban RPC for simulation
        const simulated = await this.rpcServer.simulateTransaction(transaction);
        if (rpc.Api.isSimulationError(simulated)) {
          throw new Error(`Simulation failed: ${simulated.error}`);
        }

        // Assemble and sign
        const preparedTx = rpc
          .assembleTransaction(transaction, simulated)
          .build();
        preparedTx.sign(signer);

        hash = preparedTx.hash().toString('hex');
        // Submit via Soroban RPC
        result = await this.sendAndWait(preparedTx);
      } else {
        transaction.sign(signer);
        hash = transaction.hash().toString('hex');
        result = await this.sendAndWait(transaction);
      }

      return { hash, result };
    } catch (error) {
      this.logger.error(`Transaction failed`, error);
      throw error;
    }
  }

  private async sendAndWait(
    transaction: Transaction,
  ): Promise<rpc.Api.GetTransactionResponse> {
    const result = await this.rpcServer.sendTransaction(transaction);

    if (result.status === 'ERROR') {
      throw new Error(`Send transaction failed: ${JSON.stringify(result)}`);
    }

    if (result.status === 'PENDING') {
      return this.waitForTransaction(result.hash);
    }

    // Status could be SUCCESS immediately in some cases or other states
    return this.waitForTransaction(result.hash);
  }

  async waitForTransaction(
    hash: string,
    retryAttempts = 10,
    delay = 2000,
  ): Promise<rpc.Api.GetTransactionResponse> {
    let attempts = 0;
    while (attempts < retryAttempts) {
      const tx = await this.rpcServer.getTransaction(hash);
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return tx;
      }
      if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(tx.resultXdr)}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;
    }
    throw new Error(`Transaction timeout waiting for Hash: ${hash}`);
  }
}
