import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { scValToNative } from 'stellar-sdk';
import { Repository } from 'typeorm';
import { StellarService } from './stellar.service';
import { EventStore } from '../../events/entities/event-store.entity';

/**
 * Handles cron-based ingestion of Soroban contract events from the Stellar
 * RPC into the local EventStore for offline querying and analytics.
 *
 * The RPC server dependency is provided by the shared {@link StellarService}
 * infrastructure service.
 */
@Injectable()
export class StellarEventIngestionService {
  private readonly logger = new Logger(StellarEventIngestionService.name);
  private readonly eventReorgBufferLedgers = 5;
  private readonly eventInitialLookbackLedgers = 50;

  constructor(
    private readonly configService: ConfigService,
    private readonly stellar: StellarService,
    @InjectRepository(EventStore)
    private readonly eventStoreRepository: Repository<EventStore>,
  ) {}

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

    const rpcServer = this.stellar.getRpc();
    const latestLedgerResponse = await rpcServer.getLatestLedger();
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

      const response: any = await rpcServer.getEvents(request);
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
}
