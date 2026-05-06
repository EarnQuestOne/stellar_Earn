import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataExport, DataExportStatus } from './entities/data-export.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataExportRequestedEvent } from '../../events/dto/data-export-requested.event';

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @InjectRepository(DataExport)
    private readonly dataExportRepo: Repository<DataExport>,
    private readonly eventEmitter: EventEmitter2,
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
      // Emit event instead of directly calling JobsService
      this.eventEmitter.emit(
        'user.data-export.requested',
        new DataExportRequestedEvent(userId, saved.id, exportType, format),
      );
      this.logger.log(`Emitted data export request event for user ${userId} id=${saved.id}`);
    } catch (err) {
      this.logger.error('Failed to emit export request event', err?.stack || err);
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
