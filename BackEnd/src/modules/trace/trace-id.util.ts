import { randomUUID } from 'crypto';

/**
 * TraceId format: `wh-<webhookId>-oc-<onchainTxHash>-ts-<timestamp>`
 *
 * Provides a canonical, human-readable correlation ID that links an inbound
 * webhook event to its resulting on-chain transaction. Every service boundary
 * (HTTP handler → queue → Stellar client) propagates this ID so distributed
 * traces can be reconstructed end-to-end.
 */
export interface ParsedTraceId {
  webhookId: string;
  onchainTxHash: string | null;
  timestamp: number;
  raw: string;
}

export class TraceIdUtil {
  /**
   * Generate an initial trace ID at webhook ingestion time.
   * `onchainTxHash` is unknown at this stage and defaults to `pending`.
   */
  static generate(webhookId?: string): string {
    const wid = webhookId ?? randomUUID();
    const ts = Date.now();
    return `wh-${wid}-oc-pending-ts-${ts}`;
  }

  /**
   * Upgrade a pending trace ID with the resolved on-chain transaction hash.
   */
  static linkOnchain(traceId: string, txHash: string): string {
    const parsed = TraceIdUtil.parse(traceId);
    return `wh-${parsed.webhookId}-oc-${txHash}-ts-${parsed.timestamp}`;
  }

  /**
   * Parse a trace ID into its constituent parts.
   * Returns `null` for any field that cannot be resolved.
   */
  static parse(traceId: string): ParsedTraceId {
    // Pattern: wh-<wid>-oc-<hash>-ts-<ts>
    const match = traceId.match(
      /^wh-(?<wid>[^-](?:.*?[^-])?)-oc-(?<hash>[a-zA-Z0-9]+)-ts-(?<ts>\d+)$/,
    );

    if (!match?.groups) {
      return {
        webhookId: traceId,
        onchainTxHash: null,
        timestamp: 0,
        raw: traceId,
      };
    }

    const { wid, hash, ts } = match.groups;
    return {
      webhookId: wid,
      onchainTxHash: hash === 'pending' ? null : hash,
      timestamp: parseInt(ts, 10),
      raw: traceId,
    };
  }

  /** Returns `true` if the trace has been linked to an on-chain transaction. */
  static isLinked(traceId: string): boolean {
    return TraceIdUtil.parse(traceId).onchainTxHash !== null;
  }
}
