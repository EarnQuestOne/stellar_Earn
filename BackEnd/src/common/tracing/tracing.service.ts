import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';
import { AppLoggerService } from '../logger/logger.service';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SpanAttributes {
  [key: string]: string | number | boolean;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: SpanAttributes;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  attributes: SpanAttributes;
  events: SpanEvent[];
}

export interface TraceContext {
  traceId: string;
  spanId: string;
}

// ─── Storage ───────────────────────────────────────────────────────────────

const traceStorage = new AsyncLocalStorage<TraceContext>();

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class TracingService {
  constructor(private readonly logger: AppLoggerService) {}

  // ─── Context propagation ─────────────────────────────────────────────────

  /**
   * Parse a W3C `traceparent` header into a TraceContext.
   * If the header is absent or malformed, a fresh root context is generated.
   *
   * Spec: `00-{traceId}-{parentId}-{flags}`
   */
  extractContext(traceparent?: string): TraceContext {
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length === 4 && parts[1].length === 32 && parts[2].length === 16) {
        return { traceId: parts[1], spanId: parts[2] };
      }
    }
    return { traceId: this.genTraceId(), spanId: this.genSpanId() };
  }

  /**
   * Serialise a TraceContext as a W3C `traceparent` header value.
   * Flags byte `01` = sampled.
   */
  injectContext(ctx: TraceContext): string {
    return `00-${ctx.traceId}-${ctx.spanId}-01`;
  }

  /** Run `fn` inside the given TraceContext. */
  runInContext<T>(ctx: TraceContext, fn: () => T): T {
    return traceStorage.run(ctx, fn);
  }

  /** Return the active TraceContext for the current async execution, if any. */
  getCurrentContext(): TraceContext | undefined {
    return traceStorage.getStore();
  }

  // ─── Span management ─────────────────────────────────────────────────────

  /** Create and return a new Span, automatically attached to the current trace. */
  startSpan(operationName: string, attributes: SpanAttributes = {}): Span {
    const ctx = this.getCurrentContext();
    return {
      traceId: ctx?.traceId ?? this.genTraceId(),
      spanId: this.genSpanId(),
      parentSpanId: ctx?.spanId,
      operationName,
      startTime: Date.now(),
      status: 'ok',
      attributes,
      events: [],
    };
  }

  /** Close a span and emit a structured log entry with timing information. */
  finishSpan(span: Span, error?: Error): void {
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;

    if (error) {
      span.status = 'error';
      span.attributes['error.message'] = error.message;
      span.attributes['error.type'] = error.name;
    }

    this.logger.debug(`Span: ${span.operationName}`, 'TracingService', {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      operationName: span.operationName,
      durationMs: span.durationMs,
      status: span.status,
      attributes: span.attributes,
      events: span.events,
    });
  }

  /** Record a point-in-time event on an open span. */
  addSpanEvent(
    span: Span,
    name: string,
    attributes?: SpanAttributes,
  ): void {
    span.events.push({ name, timestamp: Date.now(), attributes });
  }

  // ─── Convenience wrapper ──────────────────────────────────────────────────

  /**
   * Execute `fn` inside a new span, finishing it (successfully or with error)
   * automatically.
   *
   * @example
   * const result = await this.tracing.trace('stellar.payment', async (span) => {
   *   span.attributes['destination'] = destinationAddress;
   *   return this.stellarClient.send(tx);
   * });
   */
  async trace<T>(
    operationName: string,
    fn: (span: Span) => Promise<T>,
    attributes: SpanAttributes = {},
  ): Promise<T> {
    const span = this.startSpan(operationName, attributes);
    try {
      const result = await fn(span);
      this.finishSpan(span);
      return result;
    } catch (error) {
      this.finishSpan(span, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private genTraceId(): string {
    return randomBytes(16).toString('hex'); // 32 hex chars
  }

  private genSpanId(): string {
    return randomBytes(8).toString('hex'); // 16 hex chars
  }

  /** Expose storage for use in middleware without re-importing the module. */
  static getStorage(): AsyncLocalStorage<TraceContext> {
    return traceStorage;
  }
}
