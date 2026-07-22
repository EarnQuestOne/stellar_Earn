import {
  Controller,
  Get,
  Param,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

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
}
