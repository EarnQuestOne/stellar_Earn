import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataExport, DataExportStatus } from './entities/data-export.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DataExportRequestedEvent } from '../../events/dto/data-export-requested.event';
import { DataExportCompletedEvent } from '../../events/dto/data-export-completed.event';
import { DataExportFailedEvent } from '../../events/dto/data-export-failed.event';
import { User } from './entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(
    @InjectRepository(DataExport)
    private readonly dataExportRepo: Repository<DataExport>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    private readonly emailService: EmailService,
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
      this.logger.log(
        `Emitted data export request event for user ${userId} id=${saved.id}`,
      );
    } catch (err) {
      this.logger.error(
        'Failed to emit export request event',
        err?.stack || err,
      );
      saved.status = DataExportStatus.FAILED;
      await this.dataExportRepo.save(saved);
    }

    return saved;
  }

  async markProcessing(id: string) {
    await this.dataExportRepo.update(id, {
      status: DataExportStatus.PROCESSING,
    });
  }

  async markCompleted(id: string, payload: Partial<DataExport>) {
    await this.dataExportRepo.update(id, {
      status: DataExportStatus.COMPLETED,
      ...payload,
    });
  }

  async markFailed(id: string, _error?: string) {
    await this.dataExportRepo.update(id, { status: DataExportStatus.FAILED });
  }

  @OnEvent('user.data-export.completed', { async: true })
  async handleDataExportCompleted(event: DataExportCompletedEvent) {
    this.logger.log(`Handling export completed event for user ${event.userId}`);

    try {
      const user = await this.userRepo.findOne({ where: { id: event.userId } });
      if (!user || !user.email) {
        this.logger.error(
          `User or user email not found for userId: ${event.userId}`,
        );
        return;
      }

      await this.emailService.queueEmail({
        to: [{ email: user.email, name: user.username }],
        subject: 'Your Data Export is Ready',
        text: `Hello ${user.username},\n\nYour requested data export (${event.fileName}) is ready for download.\n\nYou can download it here:\n${event.downloadUrl}\n\nPlease note: This link will expire in 24 hours.\n\nBest regards,\nStellar Earn Team`,
        html: `<p>Hello ${user.username},</p><p>Your requested data export (<strong>${event.fileName}</strong>) is ready for download.</p><p><a href="${event.downloadUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Download Export</a></p><p>Please note: This link will expire in 24 hours.</p><p>Best regards,<br>Stellar Earn Team</p>`,
      });

      this.logger.log(
        `Successfully queued data export email for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle data export completed: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('user.data-export.failed', { async: true })
  async handleDataExportFailed(event: DataExportFailedEvent) {
    this.logger.log(`Handling export failed event for user ${event.userId}`);

    try {
      const user = await this.userRepo.findOne({ where: { id: event.userId } });
      if (!user || !user.email) {
        this.logger.error(
          `User or user email not found for userId: ${event.userId}`,
        );
        return;
      }

      await this.emailService.queueEmail({
        to: [{ email: user.email, name: user.username }],
        subject: 'Data Export Failed',
        text: `Hello ${user.username},\n\nUnfortunately, your data export request failed. Error: ${event.error}\n\nPlease try requesting again later.\n\nBest regards,\nStellar Earn Team`,
        html: `<p>Hello ${user.username},</p><p>Unfortunately, your data export request failed.</p><p><strong>Error:</strong> ${event.error}</p><p>Please try requesting again later.</p><p>Best regards,<br>Stellar Earn Team</p>`,
      });

      this.logger.log(
        `Successfully queued data export failure email for user ${event.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle data export failure: ${error.message}`,
        error.stack,
      );
    }
  }
}
