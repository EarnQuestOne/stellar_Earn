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
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    // Load related quest and user separately
    const quest = await this.getQuestById(submission.questId);
    const user = await this.getUserById(submission.userId);

    // Create a temporary object with relations
    const submissionWithRelations = {
      ...submission,
      quest,
      user,
    };

    await this.validateVerifierAuthorization(
      submissionWithRelations.quest.id,
      verifierId,
    );
    this.validateStatusTransition(submissionWithRelations.status, 'APPROVED');

    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: 'APPROVED',
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

    if (!user.stellarAddress) {
      throw new BadRequestException(
        'User does not have a Stellar address linked',
      );
    }

    // const stellarAddress = this.requireStellarAddress(
    //   submissionWithRelations.user,
    // );

    try {
      // await this.stellarService.approveSubmission(
      //   submissionWithRelations.quest.contractTaskId,
      //   stellarAddress,
      //   submissionWithRelations.quest.rewardAmount,
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

    const updatedSubmission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    // Load related quest and user separately for the updated submission
    const updatedQuest = await this.getQuestById(updatedSubmission.questId);
    const updatedUser = await this.getUserById(updatedSubmission.userId);

    // Create a temporary object with relations
    const updatedSubmissionWithRelations = {
      ...updatedSubmission,
      quest: updatedQuest,
      user: updatedUser,
    };

    await this.notificationsService.sendSubmissionApproved(
      updatedSubmission.userId,
      updatedSubmissionWithRelations.quest.title,
      updatedSubmissionWithRelations.quest.rewardAmount,
    );

    // Emit quest completed event
    this.eventEmitter.emit(
      'quest.completed',
      new QuestCompletedEvent(
        updatedSubmissionWithRelations.quest.id,
        updatedSubmission.userId,
        100, // XP increment
        updatedSubmissionWithRelations.quest.rewardAmount.toString(),
      ),
    );

    return updatedSubmission;
  }

  private requireStellarAddress(user: User): string {
    if (!user.stellarAddress) {
      throw new BadRequestException(
        'User does not have a Stellar address linked',
      );
    }
    return user.stellarAddress;
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
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    // Load related quest and user separately
    const quest = await this.getQuestById(submission.questId);
    const user = await this.getUserById(submission.userId);

    // Create a temporary object with relations
    const submissionWithRelations = {
      ...submission,
      quest,
      user,
    };

    await this.validateVerifierAuthorization(
      submissionWithRelations.quest.id,
      verifierId,
    );
    this.validateStatusTransition(submissionWithRelations.status, 'REJECTED');

    if (!rejectDto.reason || rejectDto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: 'REJECTED',
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
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    // Load related quest and user separately for the updated submission
    const updatedQuest = await this.getQuestById(updatedSubmission.questId);
    const updatedUser = await this.getUserById(updatedSubmission.userId);

    // Create a temporary object with relations
    const updatedSubmissionWithRelations = {
      ...updatedSubmission,
      quest: updatedQuest,
      user: updatedUser,
    };

    await this.notificationsService.sendSubmissionRejected(
      updatedSubmission.userId,
      updatedSubmissionWithRelations.quest.title,
      rejectDto.reason,
    );

    // Emit submission rejected event
    this.eventEmitter.emit(
      'submission.rejected',
      new SubmissionRejectedEvent(
        submissionId,
        updatedSubmission.userId,
        rejectDto.reason,
      ),
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
    return this.submissionsRepository.find({
      where: { questId },
      order: { createdAt: 'DESC' },
    });
  }

  // Helper methods to load related entities
  private async getQuestById(questId: string): Promise<Quest> {
    const questRepo = this.submissionsRepository.manager.getRepository(Quest);
    const quest = await questRepo.findOne({ where: { id: questId } });
    if (!quest) {
      throw new NotFoundException(`Quest with ID ${questId} not found`);
    }
    return quest;
  }

  private async getUserById(userId: string): Promise<User> {
    const userRepo = this.submissionsRepository.manager.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }
}
