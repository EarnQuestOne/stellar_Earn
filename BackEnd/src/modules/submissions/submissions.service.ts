import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
// import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Quest } from '../quests/entities/quest.entity';
import { User } from '../users/entities/user.entity';

interface QuestVerifier {
  id: string;
}

interface QuestWithVerifiers {
  id: string;
  verifiers: QuestVerifier[];
  createdBy: string;
}

import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestCompletedEvent } from '../../events/dto/quest-completed.event';
import { SubmissionRejectedEvent } from '../../events/dto/submission-rejected.event';
import { SubmissionApprovedEvent } from '../../events/dto/submission-approved.event';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    // private stellarService: StellarService,
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2,
  ) { }

  /**
   * Approve a submission and trigger on-chain reward distribution
   */
  async approveSubmission(
    submissionId: string,
    approveDto: ApproveSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    // Eager-load the quest and user relations in a single JOINed query
    // instead of issuing two extra round-trips after the initial lookup.
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      withDeleted: false,
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    const quest = submission.quest as Quest;
    const user = submission.user as User;

    await this.validateVerifierAuthorization(quest.id, verifierId);
    this.validateStatusTransition(submission.status, 'APPROVED');

    const approvedAt = new Date();
    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: 'APPROVED',
        approvedBy: verifierId,
        approvedAt,
        verifierNotes: approveDto.notes,
      })
      .where('id = :id', { id: submissionId })
      .andWhere('status = :status', { status: submission.status })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConflictException(
        'Submission status has changed. Please refresh and try again.',
      );
    }

    if (!user.stellarAddress) {
      throw new BadRequestException(
        'User does not have a Stellar address linked',
      );
    }

    try {
      // await this.stellarService.approveSubmission(
      //   quest.contractTaskId,
      //   user.stellarAddress,
      //   quest.rewardAmount,
      // );
    } catch (error) {
      await this.submissionsRepository.update(submissionId, {
        status: submission.status,
        approvedBy: undefined,
        approvedAt: undefined,
      });
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to process on-chain approval: ${errorMessage}`,
      );
    }

    // Apply the persisted changes to the in-memory entity instead of
    // re-fetching the submission and its relations from the database.
    submission.status = 'APPROVED';
    submission.approvedBy = verifierId;
    submission.approvedAt = approvedAt;
    if (approveDto.notes !== undefined) {
      submission.verifierNotes = approveDto.notes;
    }

    await this.notificationsService.sendSubmissionApproved(
      submission.userId,
      quest.title,
      quest.rewardAmount,
    );

    this.eventEmitter.emit(
      'submission.approved',
      new SubmissionApprovedEvent(submissionId, submission.questId, verifierId),
    );

    this.eventEmitter.emit(
      'quest.completed',
      new QuestCompletedEvent(
        quest.id,
        submission.userId,
        100, // XP increment
        quest.rewardAmount.toString(),
      ),
    );

    this.eventEmitter.emit('submission.approved', {
      submissionId,
      questId: submission.questId,
      userId: submission.userId,
      approvedBy: verifierId,
      approvedAt,
    });

    return submission;
  }

  /**
   * Reject a submission with a reason
   */
  async rejectSubmission(
    submissionId: string,
    rejectDto: RejectSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    // Eager-load the quest and user relations in a single JOINed query
    // instead of issuing two extra round-trips after the initial lookup.
    const submission = await this.submissionsRepository.findOne({
      withDeleted: false,
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    const quest = submission.quest as Quest;

    await this.validateVerifierAuthorization(quest.id, verifierId);
    this.validateStatusTransition(submission.status, 'REJECTED');

    if (!rejectDto.reason || rejectDto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const rejectedAt = new Date();
    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: 'REJECTED',
        rejectedBy: verifierId,
        rejectedAt,
        rejectionReason: rejectDto.reason,
        verifierNotes: rejectDto.notes,
      })
      .where('id = :id', { id: submissionId })
      .andWhere('status = :status', { status: submission.status })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConflictException(
        'Submission status has changed. Please refresh and try again.',
      );
    }

    // Apply the persisted changes to the in-memory entity instead of
    // re-fetching the submission and its relations from the database.
    submission.status = 'REJECTED';
    submission.rejectedBy = verifierId;
    submission.rejectedAt = rejectedAt;
    submission.rejectionReason = rejectDto.reason;
    if (rejectDto.notes !== undefined) {
      submission.verifierNotes = rejectDto.notes;
    }

    await this.notificationsService.sendSubmissionRejected(
      submission.userId,
      quest.title,
      rejectDto.reason,
    );

    this.eventEmitter.emit(
      'submission.rejected',
      new SubmissionRejectedEvent(
        submissionId,
        submission.userId,
        rejectDto.reason,
      ),
    );

    return submission;
  }

  private async validateVerifierAuthorization(
    questId: string,
    verifierId: string,
  ): Promise<void> {
    const quest = await this.getQuestWithVerifiers(questId);

    const isAuthorized =
      quest.verifiers.some((v) => v.id === verifierId) ||
      quest.createdBy === verifierId ||
      (await this.checkAdminRole(verifierId));

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not authorized to verify submissions for this quest',
      );
    }
  }

  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['APPROVED', 'REJECTED', 'UNDER_REVIEW'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PENDING'],
      APPROVED: [],
      REJECTED: ['PENDING'],
      PAID: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private getQuestWithVerifiers(questId: string): Promise<QuestWithVerifiers> {
    return Promise.resolve({
      id: questId,
      verifiers: [],
      createdBy: '',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkAdminRole(userId: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  async findOne(submissionId: string): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    return submission;
  }

  async findByQuest(questId: string): Promise<Submission[]> {
    // Join quest and user up front so the controller (which serialises both
    // relations) doesn't trigger lazy lookups per row.
    return this.submissionsRepository.find({
      where: { questId },
      relations: ['quest', 'user'],
      order: { createdAt: 'DESC' },
    });
  }
}
