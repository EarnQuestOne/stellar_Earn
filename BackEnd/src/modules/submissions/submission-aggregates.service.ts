import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { CacheService } from '../cache/cache.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SubmissionCreatedEvent } from '../../events/dto/submission-created.event';
import { SubmissionRejectedEvent } from '../../events/dto/submission-rejected.event';

export interface SubmissionAggregates {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

@Injectable()
export class SubmissionAggregatesService {
  private readonly logger = new Logger(SubmissionAggregatesService.name);

  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    private cacheService: CacheService,
  ) {}

  private getCacheKey(questId: string): string {
    return `quest_submission_aggregates:${questId}`;
  }

  async getAggregates(questId: string): Promise<SubmissionAggregates> {
    const key = this.getCacheKey(questId);
    let aggregates = await this.cacheService.get<SubmissionAggregates>(key);
    if (!aggregates) {
      aggregates = await this.recompute(questId);
      // Cache indefinitely (or for a long time) because it is updated by events
      await this.cacheService.set(key, aggregates, 86400); // 1 day
    }
    return aggregates;
  }

  private async recompute(questId: string): Promise<SubmissionAggregates> {
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      this.submissionRepository.count({ where: { questId, status: SubmissionStatus.PENDING } }),
      this.submissionRepository.count({ where: { questId, status: SubmissionStatus.APPROVED } }),
      this.submissionRepository.count({ where: { questId, status: SubmissionStatus.REJECTED } }),
    ]);
    return { pendingCount, approvedCount, rejectedCount };
  }

  @OnEvent('submission.created')
  async handleSubmissionCreated(event: SubmissionCreatedEvent) {
    const aggregates = await this.getAggregates(event.questId);
    aggregates.pendingCount++;
    await this.cacheService.set(this.getCacheKey(event.questId), aggregates, 86400);
  }

  @OnEvent('submission.approved')
  async handleSubmissionApproved(event: any) {
    // The event can be SubmissionApprovedEvent or an object literal depending on who emitted it.
    const questId = event.questId;
    if (!questId) return;
    const aggregates = await this.getAggregates(questId);
    if (aggregates.pendingCount > 0) aggregates.pendingCount--;
    aggregates.approvedCount++;
    await this.cacheService.set(this.getCacheKey(questId), aggregates, 86400);
  }

  @OnEvent('submission.rejected')
  async handleSubmissionRejected(event: SubmissionRejectedEvent) {
    // We need questId, but the event only has submissionId.
    const submission = await this.submissionRepository.findOne({
      where: { id: event.submissionId },
      select: ['questId'],
    });
    if (!submission) return;
    const aggregates = await this.getAggregates(submission.questId);
    if (aggregates.pendingCount > 0) aggregates.pendingCount--;
    aggregates.rejectedCount++;
    await this.cacheService.set(this.getCacheKey(submission.questId), aggregates, 86400);
  }
}
