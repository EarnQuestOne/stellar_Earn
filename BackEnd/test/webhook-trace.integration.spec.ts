import { TraceService } from '#src/modules/trace/trace.service';
import { WebhooksService } from '#src/modules/webhooks/webhooks.service';
import { TraceIdUtil } from '#src/modules/trace/trace-id.util';
import { TraceStatus } from '#src/modules/trace/trace.types';

describe('WebhookService (integration)', () => {
  let traceService: TraceService;
  let webhookService: WebhooksService;

  beforeEach(() => {
    traceService = new TraceService();
    webhookService = new WebhooksService(traceService);
  });

  it('should return an accepted result with a linked trace ID', async () => {
    const result = await webhookService.handleWebhook({
      deliveryId: 'gh-delivery-001',
      event: 'pull_request.closed',
      questId: 'Q-PR-001',
      submitterAddress: 'GABC123STELLAR',
      proof: { prNumber: 42 },
    });

    expect(result.accepted).toBe(true);
    expect(result.traceId).toBeTruthy();
    expect(TraceIdUtil.isLinked(result.traceId)).toBe(true);
  });

  it('should persist the trace and make it findable by webhook event ID', async () => {
    const result = await webhookService.handleWebhook({
      deliveryId: 'gh-delivery-002',
      event: 'push',
      questId: 'Q-002',
      submitterAddress: 'GXYZ789',
      proof: {},
    });

    // The trace key in the store is the LINKED ID (with tx hash embedded)
    const trace = await traceService.findByTraceId(result.traceId);
    expect(trace).not.toBeNull();
    expect(trace!.questId).toBe('Q-002');
    expect(trace!.currentStatus).toBe(TraceStatus.SUBMITTED);
    expect(trace!.onchainTxHash).not.toBeNull();
  });

  it('should produce a trace with at least two events (PENDING â†’ SUBMITTED)', async () => {
    const result = await webhookService.handleWebhook({
      deliveryId: 'gh-delivery-003',
      event: 'push',
      questId: 'Q-003',
      submitterAddress: 'GXYZ789',
      proof: {},
    });

    const trace = await traceService.findByTraceId(result.traceId);
    expect(trace!.events.length).toBeGreaterThanOrEqual(2);
    expect(trace!.events[0].status).toBe(TraceStatus.PENDING);
    expect(trace!.events[1].status).toBe(TraceStatus.SUBMITTED);
  });

  it('should be findable by quest ID after processing', async () => {
    await webhookService.handleWebhook({
      deliveryId: 'gh-delivery-004',
      event: 'push',
      questId: 'Q-FIND-ME',
      submitterAddress: 'G123',
      proof: {},
    });

    const traces = await traceService.findByQuestId('Q-FIND-ME');
    expect(traces).toHaveLength(1);
  });
});
