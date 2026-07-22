import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CreateTraceDto,
  ExecutionTrace,
  LinkOnchainDto,
  TraceEvent,
  TraceStatus,
} from './trace.types';
import { TraceIdUtil } from './trace-id.util';

/**
 * TraceService manages the lifecycle of webhook-to-onchain execution
 * traces.  It provides a write-once, append-only record of every state
 * transition so that any on-call engineer can reconstruct exactly what happened
 * between an inbound webhook and the resulting Stellar ledger entry.
 *
 * Persistence note:
 *   In a production deployment this service would inject a Prisma (or similar)
 *   repository and persist traces to Postgres.  The in-memory Map used here
 *   keeps the implementation self-contained and fully testable without a live
 *   database; swap `this.store` for repository calls to productionise.
 */
@Injectable()
export class TraceService {
  private readonly logger = new Logger(TraceService.name);
  /** In-memory store.  Replace with a Prisma repository for production. */
  private readonly store = new Map<string, ExecutionTrace>();

  // ─── Write operations ─────────────────────────────────────────────────────

  /**
   * Create a new trace at the moment a webhook event is received.
   * The trace starts in `PENDING` status with no on-chain data.
   */
  async createTrace(dto: CreateTraceDto): Promise<ExecutionTrace> {
    const now = new Date().toISOString();
    const initialEvent: TraceEvent = {
      seq: 0,
      status: TraceStatus.PENDING,
      at: now,
      message: 'Webhook received; awaiting on-chain execution.',
    };

    const trace: ExecutionTrace = {
      traceId: dto.traceId,
      webhookEventId: dto.webhookEventId,
      questId: dto.questId,
      submitterAddress: dto.submitterAddress,
      onchainTxHash: null,
      ledgerSequence: null,
      currentStatus: TraceStatus.PENDING,
      events: [initialEvent],
      createdAt: now,
      updatedAt: now,
    };

    this.store.set(dto.traceId, trace);
    this.logger.log(`[${dto.traceId}] Trace created (PENDING)`);
    return trace;
  }

  /**
   * Link an on-chain result to an existing trace.
   * Upgrades the trace ID with the real tx hash and appends a new event.
   */
  async linkOnchain(dto: LinkOnchainDto): Promise<ExecutionTrace> {
    const trace = await this.findOneOrFail(dto.traceId);

    // Upgrade the trace ID to embed the real tx hash
    const linkedTraceId = TraceIdUtil.linkOnchain(dto.traceId, dto.txHash);

    const now = new Date().toISOString();
    const nextSeq = trace.events.length;

    const newEvent: TraceEvent = {
      seq: nextSeq,
      status: dto.status,
      at: now,
      message: dto.message ?? `On-chain status updated to ${dto.status}.`,
      meta: {
        txHash: dto.txHash,
        ledgerSequence: dto.ledgerSequence ?? null,
        ...dto.meta,
      },
    };

    const updated: ExecutionTrace = {
      ...trace,
      traceId: linkedTraceId,
      onchainTxHash: dto.txHash,
      ledgerSequence: dto.ledgerSequence ?? trace.ledgerSequence,
      currentStatus: dto.status,
      events: [...trace.events, newEvent],
      updatedAt: now,
    };

    // Migrate key in store (old pending ID → new linked ID)
    this.store.delete(dto.traceId);
    this.store.set(linkedTraceId, updated);

    this.logger.log(
      `[${linkedTraceId}] Trace linked to tx ${dto.txHash} (${dto.status})`,
    );
    return updated;
  }

  /**
   * Append a status transition event to an existing trace without changing
   * the on-chain reference.  Useful for intermediate states (e.g. SUBMITTED →
   * CONFIRMED after ledger confirmation polling).
   */
  async appendEvent(
    traceId: string,
    status: TraceStatus,
    message: string,
    meta?: Record<string, unknown>,
  ): Promise<ExecutionTrace> {
    const trace = await this.findOneOrFail(traceId);
    const now = new Date().toISOString();

    const newEvent: TraceEvent = {
      seq: trace.events.length,
      status,
      at: now,
      message,
      meta,
    };

    const updated: ExecutionTrace = {
      ...trace,
      currentStatus: status,
      events: [...trace.events, newEvent],
      updatedAt: now,
    };

    this.store.set(traceId, updated);
    this.logger.log(`[${traceId}] Event appended: ${status} — ${message}`);
    return updated;
  }

  // ─── Read operations ───────────────────────────────────────────────────────

  async findByTraceId(traceId: string): Promise<ExecutionTrace | null> {
    return this.store.get(traceId) ?? null;
  }

  async findByWebhookEventId(
    webhookEventId: string,
  ): Promise<ExecutionTrace | null> {
    for (const trace of this.store.values()) {
      if (trace.webhookEventId === webhookEventId) return trace;
    }
    return null;
  }

  async findByQuestId(questId: string): Promise<ExecutionTrace[]> {
    return Array.from(this.store.values()).filter((t) => t.questId === questId);
  }

  async findByTxHash(txHash: string): Promise<ExecutionTrace | null> {
    for (const trace of this.store.values()) {
      if (trace.onchainTxHash === txHash) return trace;
    }
    return null;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private async findOneOrFail(traceId: string): Promise<ExecutionTrace> {
    const trace = this.store.get(traceId);
    if (!trace) {
      throw new NotFoundException(`Trace not found for traceId: ${traceId}`);
    }
    return trace;
  }
}
