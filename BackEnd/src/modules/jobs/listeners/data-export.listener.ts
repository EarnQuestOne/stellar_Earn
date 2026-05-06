import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataExportRequestedEvent } from '../../../events/dto/data-export-requested.event';
import { JobsService } from '../jobs.service';
import { QUEUES } from '../jobs.constants';

/**
 * Data Export Listener
 * Listens for data export requests and queues them for processing
 */
@Injectable()
export class DataExportListener {
  private readonly logger = new Logger(DataExportListener.name);

  constructor(private readonly jobsService: JobsService) {}

  @OnEvent('user.data-export.requested', { async: true })
  async handleDataExportRequested(event: DataExportRequestedEvent) {
    this.logger.log(
      `[JobsModule] Data export requested for user ${event.userId}, exportId: ${event.exportId}`,
    );

    try {
      await this.jobsService.addJob(QUEUES.EXPORTS, {
        organizationId: null,
        exportType: event.exportType,
        format: event.format,
        userId: event.userId,
        exportId: event.exportId,
      });

      this.logger.log(`Successfully queued export job for exportId: ${event.exportId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue export job for exportId ${event.exportId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
