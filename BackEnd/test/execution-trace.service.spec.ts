import { NotFoundException } from '@nestjs/common';
import { TraceService } from '#src/modules/trace/trace.service';
import { TraceIdUtil } from '#src/modules/trace/trace-id.util';
import { TraceStatus } from '#src/modules/trace/trace.types';

const makeDto = (
  overrides?: Partial<Parameters<TraceService['createTrace']>[0]>,
) => ({
  traceId: TraceIdUtil.generate('delivery-001'),
  webhookEventId: 'delivery-001',
  questId: 'Q-001',
  submitterAddress: 'GABC123',
  ...overrides,
});

describe('TraceService', () => {
  let service: TraceService;

  beforeEach(() => {
    service = new TraceService();
  });

  // â”€â”€ createTrace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('createTrace', () => {
    it('should store a trace with PENDING status', async () => {
      const dto = makeDto();
      const trace = await service.createTrace(dto);

      expect(trace.traceId).toBe(dto.traceId);
      expect(trace.currentStatus).toBe(TraceStatus.PENDING);
      expect(trace.onchainTxHash).toBeNull();
      expect(trace.events).toHaveLength(1);
      expect(trace.events[0].status).toBe(TraceStatus.PENDING);
    });

    it('should persist the trace so it can be retrieved', async () => {
      const dto = makeDto();
      await service.createTrace(dto);
      const found = await service.findByTraceId(dto.traceId);
      expect(found?.questId).toBe('Q-001');
    });
  });

  // â”€â”€ linkOnchain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('linkOnchain', () => {
    it('should upgrade the trace ID with the real tx hash', async () => {
      const dto = makeDto();
      await service.createTrace(dto);

      const linked = await service.linkOnchain({
        traceId: dto.traceId,
        txHash: 'deadbeef1234',
        status: TraceStatus.SUBMITTED,
      });

      expect(linked.onchainTxHash).toBe('deadbeef1234');
      expect(linked.traceId).toContain('deadbeef1234');
      expect(linked.currentStatus).toBe(TraceStatus.SUBMITTED);
      expect(linked.events).toHaveLength(2);
    });

    it('should migrate the store key from the old pending ID to the linked ID', async () => {
      const dto = makeDto();
      await service.createTrace(dto);

      const linked = await service.linkOnchain({
        traceId: dto.traceId,
        txHash: 'newhash',
        status: TraceStatus.SUBMITTED,
      });

      // Old key gone
      expect(await service.findByTraceId(dto.traceId)).toBeNull();
      // New key present
      expect(await service.findByTraceId(linked.traceId)).not.toBeNull();
    });

    it('should throw NotFoundException if the trace does not exist', async () => {
      await expect(
        service.linkOnchain({
          traceId: 'wh-nonexistent-oc-pending-ts-0',
          txHash: 'whatever',
          status: TraceStatus.FAILED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // â”€â”€ appendEvent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('appendEvent', () => {
    it('should append a new event and update currentStatus', async () => {
      const dto = makeDto();
      await service.createTrace(dto);

      const updated = await service.appendEvent(
        dto.traceId,
        TraceStatus.FAILED,
        'Execution timed out.',
      );

      expect(updated.currentStatus).toBe(TraceStatus.FAILED);
      expect(updated.events).toHaveLength(2);
      expect(updated.events[1].message).toBe('Execution timed out.');
    });

    it('should assign sequential seq numbers', async () => {
      const dto = makeDto();
      await service.createTrace(dto);
      await service.appendEvent(dto.traceId, TraceStatus.FAILED, 'err');
      const trace = await service.findByTraceId(dto.traceId);

      expect(trace!.events[0].seq).toBe(0);
      expect(trace!.events[1].seq).toBe(1);
    });
  });

  // â”€â”€ findByWebhookEventId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('findByWebhookEventId', () => {
    it('should find the trace by webhook delivery ID', async () => {
      const dto = makeDto({ webhookEventId: 'special-delivery' });
      await service.createTrace(dto);

      const found = await service.findByWebhookEventId('special-delivery');
      expect(found?.questId).toBe('Q-001');
    });

    it('should return null if no match', async () => {
      expect(await service.findByWebhookEventId('ghost')).toBeNull();
    });
  });

  // â”€â”€ findByQuestId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('findByQuestId', () => {
    it('should return all traces for a given quest', async () => {
      await service.createTrace(
        makeDto({
          traceId: TraceIdUtil.generate('d1'),
          webhookEventId: 'd1',
          questId: 'Q-001',
        }),
      );
      await service.createTrace(
        makeDto({
          traceId: TraceIdUtil.generate('d2'),
          webhookEventId: 'd2',
          questId: 'Q-001',
        }),
      );
      await service.createTrace(
        makeDto({
          traceId: TraceIdUtil.generate('d3'),
          webhookEventId: 'd3',
          questId: 'Q-002',
        }),
      );

      const q1Traces = await service.findByQuestId('Q-001');
      expect(q1Traces).toHaveLength(2);
    });
  });
});
