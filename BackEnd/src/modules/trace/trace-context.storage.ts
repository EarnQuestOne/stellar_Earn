import { AsyncLocalStorage } from 'async_hooks';

export interface TraceContext {
  traceId: string;
  webhookEventId: string;
  questId?: string;
  submitterId?: string;
}

/**
 * TraceContextStorage uses Node's AsyncLocalStorage to propagate the current
 * trace context across asynchronous boundaries without manual param threading.
 *
 * Usage:
 *   TraceContextStorage.run(ctx, async () => {
 *     // anything called here can access TraceContextStorage.current()
 *   });
 */
export const TraceContextStorage = new AsyncLocalStorage<TraceContext>();

export function currentTrace(): TraceContext | undefined {
  return TraceContextStorage.getStore();
}

export function currentTraceId(): string | undefined {
  return TraceContextStorage.getStore()?.traceId;
}
