/**
 * Represents the lifecycle state of a webhook-to-onchain execution trace.
 */
export enum TraceStatus {
  /** Webhook received; on-chain execution not yet initiated. */
  PENDING = 'PENDING',
  /** On-chain transaction submitted; awaiting ledger confirmation. */
  SUBMITTED = 'SUBMITTED',
  /** Transaction confirmed on the Stellar ledger. */
  CONFIRMED = 'CONFIRMED',
  /** Transaction failed or was rejected. */
  FAILED = 'FAILED',
}

/**
 * Immutable snapshot stored per trace event.  Appended to — never mutated —
 * to produce an audit log of every state transition.
 */
export interface TraceEvent {
  /** Monotonic event index within this trace (0-based). */
  seq: number;
  status: TraceStatus;
  /** ISO-8601 timestamp of this transition. */
  at: string;
  /** Human-readable description of what happened. */
  message: string;
  /** Any structured metadata relevant to this step. */
  meta?: Record<string, unknown>;
}

/**
 * A full execution trace record linking one webhook event to its
 * resulting Stellar on-chain transaction.
 */
export interface ExecutionTrace {
  /** Canonical trace ID: `wh-<webhookId>-oc-<txHash>-ts-<epochMs>` */
  traceId: string;
  /** Source webhook event identifier (e.g. GitHub delivery ID). */
  webhookEventId: string;
  /** Quest this execution belongs to. */
  questId: string;
  /** Stellar address of the submitter. */
  submitterAddress: string;
  /** Stellar transaction hash; `null` until the tx is submitted. */
  onchainTxHash: string | null;
  /** Stellar ledger sequence number; `null` until confirmed. */
  ledgerSequence: number | null;
  currentStatus: TraceStatus;
  /** Append-only event log for this trace. */
  events: TraceEvent[];
  createdAt: string;
  updatedAt: string;
}

/** DTO for creating a new trace at webhook ingestion. */
export interface CreateTraceDto {
  traceId: string;
  webhookEventId: string;
  questId: string;
  submitterAddress: string;
}

/** DTO for linking the on-chain result back to an existing trace. */
export interface LinkOnchainDto {
  traceId: string;
  txHash: string;
  ledgerSequence?: number;
  status: TraceStatus.SUBMITTED | TraceStatus.CONFIRMED | TraceStatus.FAILED;
  message?: string;
  meta?: Record<string, unknown>;
}
