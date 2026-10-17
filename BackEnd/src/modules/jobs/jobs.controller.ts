import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { DeadLetterQueueService } from './services/dead-letter-queue.service';
import { JobArchivalService } from './services/job-archival.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly dlqService: DeadLetterQueueService,
    private readonly archivalService: JobArchivalService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Job system health check' })
  @ApiResponse({ status: 200, description: 'Job system is healthy' })
  health() {
    return {
      status: 'ok',
      message: 'Job system is operational',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get job system info' })
  @ApiResponse({ status: 200, description: 'Job system information' })
  info() {
    return {
      status: 'operational',
      version: '1.0.0',
      features: ['job scheduling', 'queue management', 'monitoring'],
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({
    summary:
      'Export queue metrics (active, delayed, failed, completed, waiting) for all queues',
  })
  @ApiResponse({ status: 200, description: 'Queue metrics for all queues' })
  async getQueueMetrics() {
    return this.jobsService.getQueueMetrics();
  }

  @Get('metrics/:queue')
  @ApiOperation({ summary: 'Export queue metrics for a specific queue' })
  @ApiParam({ name: 'queue', description: 'Queue name' })
  @ApiResponse({ status: 200, description: 'Queue metrics' })
  @ApiResponse({ status: 404, description: 'Queue not found' })
  async getQueueMetricsByName(@Param('queue') queue: string) {
    const metrics = await this.jobsService.getQueueMetricsByName(queue);
    if (!metrics) throw new NotFoundException(`Queue "${queue}" not found`);
    return metrics;
  }

  @Get('dlq')
  @ApiOperation({ summary: 'List jobs in the dead-letter queue' })
  @ApiQuery({ name: 'start', required: false, type: Number })
  @ApiQuery({ name: 'end', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'DLQ jobs listed' })
  async listDlqJobs(
    @Query('start') start?: number,
    @Query('end') end?: number,
  ) {
    return this.dlqService.listDeadJobs(start ?? 0, end ?? 50);
  }

  @Get('dlq/metrics')
  @ApiOperation({ summary: 'Get dead-letter queue metrics' })
  @ApiResponse({ status: 200, description: 'DLQ metrics' })
  async getDlqMetrics() {
    return this.dlqService.getMetrics();
  }

  @Post('dlq/replay/:jobId')
  @ApiOperation({ summary: 'Replay a single DLQ job to its original queue' })
  @ApiParam({ name: 'jobId', description: 'DLQ job ID' })
  @ApiResponse({ status: 200, description: 'Job replayed' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async replayDlqJob(@Param('jobId') jobId: string) {
    const result = await this.dlqService.replayJob(jobId);
    if (!result.success && result.message.includes('not found')) {
      throw new NotFoundException(result.message);
    }
    return result;
  }

  @Post('dlq/replay-all')
  @ApiOperation({
    summary: 'Replay all DLQ jobs (optionally filtered by source queue)',
  })
  @ApiQuery({ name: 'sourceQueue', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Bulk replay result' })
  async replayAllDlqJobs(@Query('sourceQueue') sourceQueue?: string) {
    return this.dlqService.replayAll(sourceQueue);
  }

  @Post('dlq/purge')
  @ApiOperation({ summary: 'Purge all jobs from the dead-letter queue' })
  @ApiResponse({ status: 200, description: 'DLQ purged' })
  async purgeDlq() {
    return this.dlqService.purge();
  }

  // ── Archival endpoints ──────────────────────────────────────────────

  @Get('archival/metrics')
  @ApiOperation({
    summary: 'Get job archival metrics (active vs archived counts)',
  })
  @ApiResponse({ status: 200, description: 'Archival metrics' })
  async getArchivalMetrics() {
    return this.archivalService.getMetrics();
  }

  @Post('archival/archive')
  @ApiOperation({
    summary: 'Archive completed/failed jobs older than retention window',
  })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Archival result' })
  async archiveOldJobs(@Param('retentionDays') retentionDays?: string) {
    const days = retentionDays ? parseInt(retentionDays, 10) : undefined;
    return this.archivalService.archiveOldJobs(days);
  }

  @Post('archival/purge')
  @ApiOperation({
    summary: 'Permanently delete archived jobs older than archive retention',
  })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Purge result' })
  async purgeOldArchives(@Param('retentionDays') retentionDays?: string) {
    const days = retentionDays ? parseInt(retentionDays, 10) : undefined;
    return this.archivalService.purgeOldArchives(days);
  }

  @Post('archival/run')
  @ApiOperation({ summary: 'Run full archival maintenance (archive + purge)' })
  @ApiQuery({ name: 'activeRetentionDays', required: false, type: Number })
  @ApiQuery({ name: 'archiveRetentionDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Maintenance result' })
  async runMaintenance(
    @Param('activeRetentionDays') activeDays?: string,
    @Param('archiveRetentionDays') archiveDays?: string,
  ) {
    return this.archivalService.runMaintenance(
      activeDays ? parseInt(activeDays, 10) : undefined,
      archiveDays ? parseInt(archiveDays, 10) : undefined,
    );
  }
}
