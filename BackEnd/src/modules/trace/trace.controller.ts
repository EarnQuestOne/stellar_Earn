import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { TraceService } from './trace.service';
import { ExecutionTrace } from './trace.types';

/**
 * Exposes read-only endpoints for querying execution traces.
 * Write operations are performed internally by WebhookService and
 * StellarClientService — not exposed via public API to prevent
 * unauthorized manipulation of trace state.
 */
@Controller('traces')
export class TraceController {
  constructor(private readonly traceService: TraceService) {}

  /**
   * GET /traces/:traceId
   * Retrieve a full execution trace by its canonical trace ID.
   */
  @Get(':traceId')
  async getTrace(@Param('traceId') traceId: string): Promise<ExecutionTrace> {
    const trace = await this.traceService.findByTraceId(traceId);
    if (!trace) throw new NotFoundException(`Trace not found: ${traceId}`);
    return trace;
  }

  /**
   * GET /traces?questId=...
   * List all traces for a specific quest.
   */
  @Get()
  async listByQuest(
    @Query('questId') questId: string,
  ): Promise<ExecutionTrace[]> {
    if (!questId) return [];
    return this.traceService.findByQuestId(questId);
  }

  /**
   * GET /traces/by-tx/:txHash
   * Look up a trace by its Stellar transaction hash.
   */
  @Get('by-tx/:txHash')
  async getByTxHash(@Param('txHash') txHash: string): Promise<ExecutionTrace> {
    const trace = await this.traceService.findByTxHash(txHash);
    if (!trace) throw new NotFoundException(`No trace found for tx: ${txHash}`);
    return trace;
  }

  /**
   * GET /traces/by-webhook/:webhookEventId
   * Look up a trace by the originating webhook delivery ID.
   */
  @Get('by-webhook/:webhookEventId')
  async getByWebhookEventId(
    @Param('webhookEventId') webhookEventId: string,
  ): Promise<ExecutionTrace> {
    const trace = await this.traceService.findByWebhookEventId(webhookEventId);
    if (!trace)
      throw new NotFoundException(
        `No trace found for webhook event: ${webhookEventId}`,
      );
    return trace;
  }
}
