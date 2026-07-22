import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DependencyFreshnessCheckPayload } from '../job.types';
import { DependencyFreshnessService } from '../../../common/services/dependency-freshness.service';
import { QUEUES } from '../jobs.constants';
import { resolveWorkerConcurrency } from '../utils/worker-concurrency.util';

@Injectable()
@Processor(QUEUES.MAINTENANCE, {
  concurrency: resolveWorkerConcurrency(QUEUES.MAINTENANCE),
})
export class DependencyProcessor extends WorkerHost {
  private readonly logger = new Logger(DependencyProcessor.name);

  constructor(
    private readonly dependencyFreshnessService: DependencyFreshnessService,
  ) {
    super();
  }

  async process(job: Job<DependencyFreshnessCheckPayload>): Promise<void> {
    if (job.name !== 'dependency:freshness-check') return;
    this.logger.log(
      `Processing dependency freshness check for ${job.data.repositoryOwner}/${job.data.repositoryName}`,
    );

    try {
      const result = await this.dependencyFreshnessService.checkAndReport(
        job.data.repositoryOwner,
        job.data.repositoryName,
        job.data.branch || 'main',
      );

      this.logger.log(
        `Dependency freshness check completed. Issue created: ${result.issueUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Dependency freshness check failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
