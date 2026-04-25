import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataExport, DataExportStatus } from './entities/data-export.entity';
import { JobsService } from '../jobs/jobs.service';
import { QUEUES } from '../jobs/jobs.constants';

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @InjectRepository(DataExport)
    private readonly dataExportRepo: Repository<DataExport>,
    private readonly jobsService: JobsService,
  ) {}

  async requestExport(userId: string, exportType: string, format: string) {
    const exportRecord = this.dataExportRepo.create({
      userId,
      exportType,
      format,
      status: DataExportStatus.PENDING,
    });

    const saved = await this.dataExportRepo.save(exportRecord);

    try {
      await this.jobsService.addJob(QUEUES.EXPORTS, {
        organizationId: null,
        exportType,
        format,
        userId,
        exportId: saved.id,
      });
      this.logger.log(`Queued export job for user ${userId} id=${saved.id}`);
    } catch (err) {
      this.logger.error('Failed to enqueue export job', err?.stack || err);
      saved.status = DataExportStatus.FAILED;
      await this.dataExportRepo.save(saved);
    }

    return saved;
  }

  async markProcessing(id: string) {
    await this.dataExportRepo.update(id, { status: DataExportStatus.PROCESSING });
  }

  async markCompleted(id: string, payload: Partial<DataExport>) {
    await this.dataExportRepo.update(id, { status: DataExportStatus.COMPLETED, ...payload });
  }

  async markFailed(id: string, error?: string) {
    await this.dataExportRepo.update(id, { status: DataExportStatus.FAILED });
  }
}
