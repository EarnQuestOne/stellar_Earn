import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PoisonMessage,
  PoisonMessageStatus,
} from '../entities/poison-message.entity';

@Injectable()
export class PoisonMessageService {
  private readonly logger = new Logger(PoisonMessageService.name);

  constructor(
    @InjectRepository(PoisonMessage)
    private readonly poisonMessageRepository: Repository<PoisonMessage>,
  ) {}

  async quarantine(
    eventName: string,
    payload: any,
    error: string,
    metadata?: any,
    maxRetries = 5,
  ): Promise<PoisonMessage> {
    const existing = await this.poisonMessageRepository.findOne({
      where: { eventName, status: PoisonMessageStatus.QUARANTINED },
    });

    if (existing) {
      return this.recordRetryFailure(existing, error);
    }

    const message = this.poisonMessageRepository.create({
      eventName,
      payload,
      metadata,
      lastError: error,
      maxRetries,
      errorHistory: [{ error, attemptedAt: new Date().toISOString() }],
    });

    const saved = await this.poisonMessageRepository.save(message);
    this.logger.warn(
      `Quarantined poison message: ${eventName} (id: ${saved.id})`,
    );
    return saved;
  }

  private async recordRetryFailure(
    message: PoisonMessage,
    error: string,
  ): Promise<PoisonMessage> {
    const history = message.errorHistory || [];
    history.push({ error, attemptedAt: new Date().toISOString() });

    message.retryCount += 1;
    message.lastError = error;
    message.errorHistory = history;

    if (message.retryCount >= message.maxRetries) {
      message.status = PoisonMessageStatus.DISCARDED;
      this.logger.error(
        `Poison message ${message.id} (${message.eventName}) discarded after ${message.retryCount} retries`,
      );
    }

    return this.poisonMessageRepository.save(message);
  }

  async getQuarantined(): Promise<PoisonMessage[]> {
    return this.poisonMessageRepository.find({
      where: { status: PoisonMessageStatus.QUARANTINED },
      order: { quarantinedAt: 'ASC' },
    });
  }

  async markResolved(id: string): Promise<void> {
    await this.poisonMessageRepository.update(id, {
      status: PoisonMessageStatus.RESOLVED,
      resolvedAt: new Date(),
    });
    this.logger.log(`Poison message ${id} marked as resolved`);
  }

  async markRetrying(id: string): Promise<void> {
    await this.poisonMessageRepository.update(id, {
      status: PoisonMessageStatus.RETRYING,
    });
  }

  async resetToQuarantined(id: string): Promise<void> {
    await this.poisonMessageRepository.update(id, {
      status: PoisonMessageStatus.QUARANTINED,
    });
  }
}
