import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

interface QuestVerifier {
  id: string;
}

interface QuestWithVerifiers {
  id: string;
  verifiers: QuestVerifier[];
  createdBy: string;
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    private stellarService: StellarService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Approve a submission and trigger on-chain reward distribution
   */
  async approveSubmission(
    submissionId: string,
    approveDto: ApproveSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    await this.validateVerifierAuthorization(submission.quest.id, verifierId);
    this.validateStatusTransition(submission.status, SubmissionStatus.APPROVED);

    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: SubmissionStatus.APPROVED,
        approvedBy: verifierId,
        approvedAt: new Date(),
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

    try {
      await this.stellarService.approveSubmission(
        submission.quest.contractTaskId,
        submission.user.stellarAddress,
        submission.quest.rewardAmount,
      );
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

    const updatedSubmission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    await this.notificationsService.sendSubmissionApproved(
      updatedSubmission.user.id,
      updatedSubmission.quest.title,
      updatedSubmission.quest.rewardAmount,
    );

    return updatedSubmission;
  }

  /**
   * Reject a submission with a reason
   */
  async rejectSubmission(
    submissionId: string,
    rejectDto: RejectSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    await this.validateVerifierAuthorization(submission.quest.id, verifierId);
    this.validateStatusTransition(submission.status, SubmissionStatus.REJECTED);

    if (!rejectDto.reason || rejectDto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: SubmissionStatus.REJECTED,
        rejectedBy: verifierId,
        rejectedAt: new Date(),
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

    const updatedSubmission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    await this.notificationsService.sendSubmissionRejected(
      updatedSubmission.user.id,
      updatedSubmission.quest.title,
      rejectDto.reason,
    );

    return updatedSubmission;
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
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): void {
    const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      [SubmissionStatus.PENDING]: [
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
        SubmissionStatus.UNDER_REVIEW,
      ],
      [SubmissionStatus.UNDER_REVIEW]: [
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
        SubmissionStatus.PENDING,
      ],
      [SubmissionStatus.APPROVED]: [],
      [SubmissionStatus.REJECTED]: [SubmissionStatus.PENDING],
      [SubmissionStatus.PAID]: [],
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
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    return submission;
  }

  async findByQuest(questId: string): Promise<Submission[]> {
    return this.submissionsRepository.find({
      where: { quest: { id: questId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
