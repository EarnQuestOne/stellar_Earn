import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Account,
  Address,
  Keypair,
  Operation,
  rpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from 'stellar-sdk';
import * as StellarSdk from 'stellar-sdk';
import { Repository } from 'typeorm';
import { TracingService } from '../../common/tracing/tracing.service';
import { MetricsService } from '../../common/services/metrics.service';
import { EventStore } from '../../events/entities/event-store.entity';

export interface ApproveSubmissionResult {
  transactionHash: string;
  ledger: number;
  success: boolean;
}

/**
 * Outline of how a Soroban contract call flows through this service:
 *
 *   approveSubmission(...)
 *     │  validate args + read CONTRACT_ID
 *     │  tracing.trace('stellar.contract.approve_submission')
 *     │      │  build tx (Operation.invokeContractFunction)
 *     │      │  simulateTransaction → if error: throw BadRequestException
 *     │      └► _signAndSubmitContract(tx, contractId, functionName)
 *     │              │  load account, sign tx, submit via Horizon
 *     │              │  tracing.trace('stellar.contract.submit') — once
 *     │              │  metrics emitted once with correct labels
 *     │              └► return { hash, ledger }
 *     └► return { transactionHash, ledger, success: true }
 *
 * `_signAndSubmitContract` takes the contract id + function name
 * explicitly because the SDK's operation object doesn't expose them at
 * the top level for `invokeContractFunction` operations — extracting
 * `op.contract` / `op.function` (the old `signAndSubmit` heuristic)
 * returns `undefined` and forces metric labels to "unknown".
 */
@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private horizonServer: StellarSdk.Horizon.Server;
  private rpcServer: rpc.Server;
  private networkPassphrase: string;
  private readonly eventReorgBufferLedgers = 5;
  private readonly eventInitialLookbackLedgers = 50;

  constructor(
    private readonly configService: ConfigService,
    private readonly tracing: TracingService,
    private readonly metrics: MetricsService,
    @InjectRepository(EventStore)
    private readonly eventStoreRepository: Repository<EventStore>,
  ) {}

  onModuleInit() {
    this.initializeStellarComponents();
  }

  private initializeStellarComponents() {
    const horizonUrl =
      this.configService.get<string>('STELLAR_HORIZON_URL') ||
      'https://horizon-testnet.stellar.org';
    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const network = this.configService.get<string>('STELLAR_NETWORK');

    this.horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    this.rpcServer = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith('http://'),
    });
    this.networkPassphrase =
      network === 'PUBLIC'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    this.logger.log(`Stellar Service initialized on ${network}`);
  }

  /**
   * Build, simulate, sign, and submit a Soroban contract call to
   * `approve_submission(quest_id, submitter, verifier)` on the configured
   * earn-quest contract. The admin keypair from `STELLAR_ADMIN_SECRET` (or
   * `SOROBAN_SECRET_KEY` as a fallback) is used to sign the transaction.
   *
   * Returns the transaction hash and ledger on success. Throws:
   *  - `BadRequestException` if the contract simulation rejects the call
   *    (wrong verifier, quest not found, quest full, etc.).
   *  - `ServiceUnavailableException` if submission to the network itself
   *    fails.
   *
   * NOTE: This method is intentionally tied to the current earn-quest
   * contract surface. If the contract signature changes, this method
   * should be updated in lockstep with src/lib.rs.
   */
  async approveSubmission(
    questContractId: string,
    submitterAddress: string,
    verifierAddress: string,
  ): Promise<ApproveSubmissionResult> {
    if (!questContractId) {
      throw new BadRequestException('questContractId is required');
    }
    if (!submitterAddress) {
      throw new BadRequestException('submitterAddress is required');
    }
    if (!verifierAddress) {
      throw new BadRequestException('verifierAddress is required');
    }

    const contractId = this.configService.get<string>('CONTRACT_ID');
    if (!contractId) {
      throw new ServiceUnavailableException(
        'CONTRACT_ID is not configured; cannot invoke approve_submission',
      );
    }

    return this.tracing.trace(
      'stellar.contract.approve_submission',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = 'approve_submission';
        span.attributes['stellar.quest.id'] = questContractId;
        span.attributes['stellar.submitter.address'] = submitterAddress;
        span.attributes['stellar.verifier.address'] = verifierAddress;

        const secret =
          this.configService.get<string>('STELLAR_ADMIN_SECRET') ||
          this.configService.get<string>('SOROBAN_SECRET_KEY');
        if (!secret) {
          const msg =
            'STELLAR_ADMIN_SECRET (or SOROBAN_SECRET_KEY) is not configured';
          span.status = 'error';
          span.attributes['error.message'] = msg;
          span.attributes['error.type'] = 'MissingSecret';
          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: 'approve_submission',
              error_type: 'missing_secret',
            },
          );
          throw new ServiceUnavailableException(msg);
        }

        const adminKeypair = Keypair.fromSecret(secret);
        const sourcePubKey = adminKeypair.publicKey();
        const accountResponse =
          await this.horizonServer.loadAccount(sourcePubKey);
        const source = new Account(sourcePubKey, accountResponse.sequence);

        const tx = new TransactionBuilder(source, {
          fee: '100',
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(
            Operation.invokeContractFunction({
              contract: contractId,
              function: 'approve_submission',
              args: [
                nativeToScVal(questContractId, { type: 'symbol' }),
                new Address(submitterAddress).toScVal(),
                new Address(verifierAddress).toScVal(),
              ],
            }),
          )
          .setTimeout(30)
          .build();

        // Simulate first to surface contract-level errors (wrong
        // verifier, quest full, etc.) as 400s rather than burning fees.
        const sim = await this.rpcServer.simulateTransaction(tx);
        if (rpc.Api.isSimulationError(sim)) {
          const errorMsg =
            typeof sim.error === 'string' ? sim.error : 'simulation failed';
          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] = 'SimulationError';
          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: 'approve_submission',
              error_type: 'simulation_error',
            },
          );
          this.logger.warn(
            `approve_submission simulation failed for quest=${questContractId}: ${errorMsg}`,
          );
          throw new BadRequestException(
            `Contract rejected approve_submission: ${errorMsg}`,
          );
        }

        // Delegate signing + Horizon submission to the helper so
        // tracing/metrics with the correct labels are emitted exactly
        // once.
        const result = await this._signAndSubmitContract(
          tx,
          contractId,
          'approve_submission',
        );

        span.attributes['stellar.tx.ledger'] = result.ledger;
        span.attributes['stellar.tx.status'] = 'success';

        this.logger.log(
          `approve_submission completed for quest=${questContractId} submitter=${submitterAddress} tx=${result.hash}`,
        );

        return {
          transactionHash: result.hash,
          ledger: result.ledger,
          success: true,
        };
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': 'approve_submission',
      },
    );
  }

  @Cron('*/30 * * * * *')
  async ingestContractEvents(): Promise<void> {
    const contractId = this.configService.get<string>('CONTRACT_ID') || '';
    const enabled =
      (
        this.configService.get<string>('STELLAR_EVENT_STREAMING_ENABLED') ||
        'true'
      ).toLowerCase() !== 'false';

    if (!enabled || !contractId) {
      return;
    }

    const pageSize = Number(
      this.configService.get<string>('STELLAR_EVENT_PAGE_SIZE') || '200',
    );

    const latestLedgerResponse = await this.rpcServer.getLatestLedger();
    const finalLedger = Math.max(
      1,
      latestLedgerResponse.sequence - this.eventReorgBufferLedgers,
    );

    if (finalLedger <= 0) {
      return;
    }

    const lastStoredLedger = await this.getLatestStoredEventLedger(contractId);
    const startLedger = lastStoredLedger
      ? Math.max(1, lastStoredLedger - this.eventReorgBufferLedgers)
      : Math.max(1, finalLedger - this.eventInitialLookbackLedgers);

    if (startLedger > finalLedger) {
      return;
    }

    let cursor: string | undefined;
    let totalSaved = 0;

    let hasMore = true;
    while (hasMore) {
      const request: any = cursor
        ? {
            filters: [{ type: 'contract', contractIds: [contractId] }],
            cursor,
            limit: pageSize,
          }
        : {
            filters: [{ type: 'contract', contractIds: [contractId] }],
            startLedger,
            endLedger: finalLedger,
            limit: pageSize,
          };

      const response: any = await this.rpcServer.getEvents(request);
      const events = Array.isArray(response?.events) ? response.events : [];

      for (const event of events) {
        const saved = await this.persistContractEvent(event, contractId);
        if (saved) {
          totalSaved += 1;
        }
      }

      cursor = response?.cursor;

      if (!cursor || events.length === 0 || events.length < pageSize) {
        hasMore = false;
      }
    }

    if (totalSaved > 0) {
      this.logger.log(
        `Ingested ${totalSaved} Stellar contract events for ${contractId} through ledger ${finalLedger}`,
      );
    }
  }

  /**
   * Sign `tx` with the configured admin keypair and submit it to the
   * horizon endpoint. Emits `stellar.contract.submit` tracing + the
   * shared `stellar_contract_invocations_total{contract_id, function}`
   * counter using the *explicitly-passed* labels so they don't degrade
   * to `'unknown'` for `invokeContractFunction` ops.
   *
   * Wrapped version that delegates to {@link _signAndSubmitContract}
   * with labels derived from the first operation. Preserved for callers
   * (tests, other modules) that may already use it.
   */
  async signAndSubmit(transaction: StellarSdk.Transaction): Promise<any> {
    let contractId = 'unknown';
    let functionName = 'unknown';

    if (transaction.operations && transaction.operations.length > 0) {
      const op = transaction.operations[0] as any;
      if (op.type === 'invokeContractFunction') {
        // For invokeContractFunction ops the SDK does not expose
        // `contract`/`function` as top-level instance properties; fall
        // back to inspecting the inner HostFunction if present.
        contractId = typeof op.contract === 'string' ? op.contract : 'unknown';
        functionName =
          typeof op.function === 'string'
            ? op.function
            : 'invokeContractFunction';
      }
    }

    return this._signAndSubmitContract(transaction, contractId, functionName);
  }

  /**
   * Lower-level sign + submit with explicit labels. The single source
   * of truth for the contract-call tracing + metrics shape.
   */
  private async _signAndSubmitContract(
    transaction: StellarSdk.Transaction,
    contractId: string,
    functionName: string,
  ): Promise<{ hash: string; ledger: number }> {
    const secretKey = this.configService.get<string>('STELLAR_ADMIN_SECRET');
    if (!secretKey) {
      throw new InternalServerErrorException(
        'Stellar admin secret is not configured in .env',
      );
    }

    return this.tracing.trace(
      'stellar.contract.submit',
      async (span) => {
        span.attributes['stellar.contract.id'] = contractId;
        span.attributes['stellar.contract.function'] = functionName;
        span.attributes['stellar.tx.hash'] = transaction.hash().toString('hex');

        this.metrics.incrementCounter('stellar_contract_invocations_total', {
          contract_id: contractId,
          function: functionName,
        });

        const startTime = Date.now();

        try {
          const signer = StellarSdk.Keypair.fromSecret(secretKey);
          transaction.sign(signer);

          const result =
            await this.horizonServer.submitTransaction(transaction);

          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: functionName,
              status: 'success',
            },
          );

          span.attributes['stellar.tx.ledger'] = result.ledger;
          span.attributes['stellar.tx.status'] = 'success';

          return {
            hash: transaction.hash().toString('hex'),
            ledger: result.ledger,
          };
        } catch (error) {
          const duration = Date.now() - startTime;
          this.metrics.observeHistogram(
            'stellar_contract_invocation_duration_ms',
            duration,
            {
              contract_id: contractId,
              function: functionName,
              status: 'failure',
            },
          );

          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Signing or submission failed: ${errorMsg}`,
            error instanceof Error ? error.stack : undefined,
          );

          span.status = 'error';
          span.attributes['error.message'] = errorMsg;
          span.attributes['error.type'] =
            error instanceof Error ? error.name : 'SigningOrSubmissionError';

          this.metrics.incrementCounter(
            'stellar_contract_invocation_failures_total',
            {
              contract_id: contractId,
              function: functionName,
              error_type: 'submission_error',
            },
          );

          throw new InternalServerErrorException(
            `Transaction signing security failure: ${errorMsg}`,
          );
        }
      },
      {
        'stellar.contract.id': contractId,
        'stellar.contract.function': functionName,
      },
    );
  }

  private async persistContractEvent(
    event: any,
    contractId: string,
  ): Promise<boolean> {
    const sourceId = String(event?.id ?? '');
    if (!sourceId) {
      return false;
    }

    const existing = await this.eventStoreRepository.findOne({
      where: { sourceId },
    });
    if (existing) {
      return false;
    }

    const nativeTopics = Array.isArray(event?.topic)
      ? event.topic.map((topic: any) => this.safeToNative(topic))
      : [];
    const nativeValue = this.safeToNative(event?.value);
    const eventName = this.normalizeContractEventName(
      nativeTopics,
      nativeValue,
    );
    const ledger = Number(event?.ledger ?? event?.ledgerSequence ?? NaN);
    const transactionHash =
      typeof event?.transactionHash === 'string' ? event.transactionHash : null;
    const timestamp = this.parseEventTimestamp(
      event?.ledgerClosedAt ?? event?.closedAt,
    );

    await this.eventStoreRepository.save(
      this.eventStoreRepository.create({
        eventName,
        source: 'stellar.contract',
        sourceId,
        contractId,
        transactionHash,
        ledger: Number.isFinite(ledger) ? ledger : null,
        timestamp,
        payload: {
          contractId,
          eventId: sourceId,
          topics: nativeTopics,
          value: nativeValue,
          inSuccessfulContractCall: event?.inSuccessfulContractCall ?? null,
          transactionHash,
          transactionIndex: event?.transactionIndex ?? null,
          operationIndex: event?.operationIndex ?? null,
          ledger: Number.isFinite(ledger) ? ledger : null,
          ledgerClosedAt: event?.ledgerClosedAt ?? null,
        },
        metadata: {
          source: 'stellar.rpc',
          eventId: sourceId,
          cursor: event?.pagingToken ?? null,
          reorgBufferLedgers: this.eventReorgBufferLedgers,
        },
      }),
    );

    return true;
  }

  private async getLatestStoredEventLedger(
    contractId: string,
  ): Promise<number | null> {
    const latestEvent = await this.eventStoreRepository.findOne({
      where: {
        source: 'stellar.contract',
        contractId,
      },
      order: {
        ledger: 'DESC',
        timestamp: 'DESC',
      },
    });

    return latestEvent?.ledger ?? null;
  }

  private safeToNative(value: any): any {
    try {
      return scValToNative(value);
    } catch {
      return value;
    }
  }

  private normalizeContractEventName(topics: any[], nativeValue: any): string {
    const candidate =
      this.extractEventLabel(topics[0]) || this.extractEventLabel(nativeValue);

    if (!candidate) {
      return 'stellar.contract.event';
    }

    return `stellar.contract.event.${candidate}`;
  }

  private extractEventLabel(value: any): string {
    if (typeof value === 'string') {
      return this.sanitizeEventSegment(value);
    }

    if (typeof value === 'object' && value !== null) {
      const keys = ['event', 'eventName', 'name', 'type', 'status', 'action'];

      for (const key of keys) {
        const candidate = value[key];
        if (typeof candidate === 'string' && candidate.trim()) {
          return this.sanitizeEventSegment(candidate);
        }
      }
    }

    return '';
  }

  private sanitizeEventSegment(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 80);
  }

  private parseEventTimestamp(value: any): Date {
    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime()) ? new Date() : timestamp;
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  /**
   * Send a native XLM (or other asset) payment via Stellar Horizon.
   *
   * Uses the configured admin keypair (`SOROBAN_SECRET_KEY` /
   * `STELLAR_ADMIN_SECRET`) as the source account.  Intended for payout
   * job execution where the platform wallet disburses funds to a recipient.
   */
  async sendPayment(
    recipientAddress: string,
    amount: number,
    asset: string = 'XLM',
  ): Promise<{ transactionHash: string; ledger: number }> {
    const secretKey =
      this.configService.get<string>('SOROBAN_SECRET_KEY') ||
      this.configService.get<string>('STELLAR_ADMIN_SECRET');

    if (!secretKey) {
      throw new Error('No Stellar secret key configured for payments');
    }

    const sourceKeypair = Keypair.fromSecret(secretKey);
    const sourceAccount = await this.horizonServer.loadAccount(
      sourceKeypair.publicKey(),
    );

    const paymentAsset =
      asset === 'XLM'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(asset, sourceKeypair.publicKey());

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: recipientAddress,
          asset: paymentAsset,
          amount: amount.toFixed(7),
        }),
      )
      .setTimeout(30)
      .build();

    tx.sign(sourceKeypair);

    const result = await this.horizonServer.submitTransaction(tx);

    return {
      transactionHash: result.hash,
      ledger: (result as any).ledger ?? 0,
    };
  }
}
