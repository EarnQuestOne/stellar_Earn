import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Operation,
  TransactionBuilder,
  rpc,
  nativeToScVal,
  scValToNative,
  Networks,
} from 'stellar-sdk';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';

export interface OnChainQuestState {
  id: string;
  creator: string;
  reward_asset: string;
  reward_amount: bigint;
  verifier: string;
  deadline: bigint;
  status: 'Active' | 'Paused' | 'Completed' | 'Expired' | 'Cancelled';
  total_claims: number;
}

/**
 * SorobanQuestReaderService
 * Read-only contract helpers for fetching quest state from the Earn Quest contract.
 */
@Injectable()
export class SorobanQuestReaderService {
  private readonly logger = new Logger(SorobanQuestReaderService.name);

  private readonly rpcServer: rpc.Server;
  private readonly networkPassphrase: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracing: TracingService,
    private readonly metrics: MetricsService,
  ) {
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';

    const network =
      this.configService.get<string>('STELLAR_NETWORK') ||
      this.configService.get<string>('NETWORK') ||
      'TESTNET';

    // Keep compatibility with existing env conventions:
    // - 'PUBLIC' or 'MAINNET' => Stellar public network passphrase
    // - everything else => testnet
    const normalized = network.toUpperCase();
    this.networkPassphrase =
      normalized === 'PUBLIC' || normalized === 'MAINNET'
        ? Networks.PUBLIC
        : Networks.TESTNET;

    this.rpcServer = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith('http://'),
    });
  }

  async getQuest(
    contractId: string,
    questId: string,
  ): Promise<OnChainQuestState | null> {
    if (!contractId) throw new Error('Missing contractId');
    if (!questId) throw new Error('Missing questId');

    return this.tracing.trace(
      'stellar.contract.get_quest',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = 'get_quest';
        span.attributes['stellar.contract.quest_id'] = questId;

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: 'get_quest',
        });

        const startTime = Date.now();

        try {
          // Simulation-only invocation does not require a funded account; a dummy account/sequence is sufficient.
          const source = new Account(
            // Generate a deterministic but valid public key-like value is not required; use contractId as source is invalid.
            // Using a well-formed placeholder would be better, but for simulation the SDK accepts any Account ID string.
            // To avoid failures on strict validation, require caller to supply SOURCE_ACCOUNT if present.
            this.configService.get<string>('SOROBAN_SIM_SOURCE_ACCOUNT') ||
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            '0',
          );

          const tx = new TransactionBuilder(source, {
            fee: '100',
            networkPassphrase: this.networkPassphrase,
          })
            .addOperation(
              Operation.invokeContractFunction({
                contract: contractId,
                function: 'get_quest',
                args: [nativeToScVal(questId, { type: 'symbol' })],
              }),
            )
            .setTimeout(0)
            .build();

          const sim = await this.rpcServer.simulateTransaction(tx);

          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_quest',
              status: 'success',
            },
          );

          if (rpc.Api.isSimulationError(sim)) {
            // "Quest not found" will manifest as a contract error. Treat as missing.
            const errorMsg =
              typeof sim.error === 'string'
                ? sim.error
                : 'unknown simulation error';
            this.logger.warn(
              `Simulation error fetching quest ${questId}: ${errorMsg}`,
            );

            // Record failure in tracing span
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationError';

            // Record failure in metrics
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_quest',
                error_type: 'simulation_error',
              },
            );

            return null;
          }

          if (!rpc.Api.isSimulationSuccess(sim)) {
            const errorMsg = 'Unexpected simulation response';
            this.logger.warn(`${errorMsg} for quest ${questId}`);

            // Record failure in tracing span
            span.status = 'error';
            span.attributes['error.message'] = errorMsg;
            span.attributes['error.type'] = 'SimulationFailure';

            // Record failure in metrics
            this.metrics.incrementCounter(
              'stellar_contract_invocation_failures_total',
              {
                contract_id: contractId,
                function: 'get_quest',
                error_type: 'simulation_failure',
              },
            );

            return null;
          }

          const retval = sim.result?.retval;
          if (!retval) {
            span.attributes['stellar.contract.result'] = 'empty';
            return null;
          }

          const native = scValToNative(retval);
          span.attributes['stellar.contract.result'] = 'success';

          // Expected shape: { id, creator, reward_asset, reward_amount, verifier, deadline, status, total_claims }
          return {
            id: String(native.id),
            creator: String(native.creator),
            reward_asset: String(native.reward_asset),
            reward_amount: BigInt(native.reward_amount),
            verifier: String(native.verifier),
            deadline: BigInt(native.deadline),
            status: String(native.status) as OnChainQuestState['status'],
            total_claims: Number(native.total_claims),
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: 'get_quest',
              status: 'failure',
            },
          );

          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Exception during getQuest for quest ${questId}: ${errorMsg}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Record failure in tracing span
          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] =
            error instanceof Error ? error.name : 'UnknownError';

          // Record failure in metrics
          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: 'get_quest',
              error_type: 'exception',
            },
          );

          throw error;
        }
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'get_quest',
        'stellar.contract.quest_id': questId,
      },
    );
  }
}
