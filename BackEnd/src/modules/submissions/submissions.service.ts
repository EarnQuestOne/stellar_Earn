import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

/**
 * Sentinel error thrown inside the capacity-gate transaction when the
 * conditional UPDATE returns zero affected rows. We deliberately throw a
 * typed sentinel rather than a NestJS HTTP exception so the transaction
 * rolls back cleanly; the outer catch is responsible for re-fetching the
 * quest and surfacing the right exception type to the caller.
 */
class CapacityGateFailedError extends Error {
  constructor() {
    super('Capacity gate did not match any quest row');
    this.name = 'CapacityGateFailedError';
  }
}
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Quest } from '../quests/entities/quest.entity';
import { User } from '../users/entities/user.entity';
import { MetricsService } from '../../common/services/metrics.service';

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
import { SubmissionCreatedEvent } from '../../events/dto/submission-created.event';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Quest)
    private questsRepository: Repository<Quest>,
    private stellarService: StellarService,
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2,
    private metricsService: MetricsService,
  ) {}

  /**
   * Create a new submission for a quest.
   *
   * Three pre-flight gates run BEFORE any DB write, preserving the
   * validator-before-mutate invariant:
   *   1. Authenticated user exists.
   *   2. Authenticated user has a Stellar wallet linked.
   *
   * Then, inside a single transaction:
   *   3. Atomic capacity gate via a conditional UPDATE that atomically
   *      increments `quest.currentCompletions` only if the quest exists,
   *      is ACTIVE, AND the row still has remaining capacity.
   *   4. INSERT the new Submission row in PENDING.
   *
   * Both writes share the same transaction so a failure of the INSERT
   * after the increment rolls back the increment — no leaked capacity.
   *
   * If the conditional UPDATE returns zero affected rows, we throw a
   * typed sentinel inside the transaction (causing rollback) then
   * re-fetch the quest in the outer catch to disambiguate NotFound vs
   * not-ACTIVE vs full and surface the right typed exception.
   *
   * @param questId  Quest the submission is for (UUID from path).
   * @param dto      Validated proof payload. userId is NOT in this DTO; the
   *                 controller injects it from the authenticated JWT.
   * @param userId   Authenticated user id from `req.user.id`.
   */
  async createSubmission(
    questId: string,
    dto: CreateSubmissionDto,
    userId: string,
  ): Promise<Submission> {
    // 1. Submitter gate — runs OUTSIDE the transaction so we don't
    //    hold a row lock while checking an unrelated table.
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      withDeleted: false,
    });
    if (!user) {
      throw new ForbiddenException('Authenticated user not found');
    }
    if (!user.stellarAddress) {
      throw new BadRequestException(
        'You must link a Stellar wallet before submitting proof',
      );
    }

    // 2. Atomic capacity gate + submission INSERT in one transaction.
    //    The conditional WHERE narrows the row-level lock to the single
    //    quest row, so the lock is held for microseconds.
    let saved: Submission | undefined;
    try {
      await this.submissionsRepository.manager.transaction(
        async (entityManager) => {
          const capacityResult = await entityManager
            .createQueryBuilder()
            .update(Quest)
            .set({
              currentCompletions: () => 'currentCompletions + 1',
              // TypeORM's QueryBuilder.update() does not auto-update
              // @UpdateDateColumn — we set it explicitly so the quest
              // row reflects the most recent submission time.
              updatedAt: () => 'CURRENT_TIMESTAMP',
            })
            .where('id = :questId', { questId })
            .andWhere('status = :active', { active: 'ACTIVE' })
            .andWhere(
              new Brackets((qb) => {
                qb.where('maxCompletions IS NULL').orWhere(
                  'currentCompletions < maxCompletions',
                );
              }),
            )
            .execute();
          if (!capacityResult.affected) {
            // Sentinel-throw inside the transaction ⇒ rollback. The
            // outer catch re-reads the quest to disambiguate.
            throw new CapacityGateFailedError();
          }
          const submission = entityManager.create(Submission, {
            questId,
            userId,
            proof: {
              fileName: dto.fileName,
              fileContent: dto.fileContent,
            },
            status: SubmissionStatus.PENDING,
            verifierNotes: dto.notes ?? null,
          });
          saved = await entityManager.save(submission);
        },
      );
    } catch (err) {
      if (err instanceof CapacityGateFailedError) {
        // Re-fetch the quest to disambiguate the failure cause. This is
        // a cheap read; we accept the extra round-trip in exchange for
        // a precise exception type to the caller.
        const current = await this.questsRepository.findOne({
          where: { id: questId },
          withDeleted: false,
        });
        if (!current) {
          throw new NotFoundException(`Quest with ID ${questId} not found`);
        }
        if (current.status !== 'ACTIVE') {
          throw new BadRequestException(
            `Quest is not accepting submissions (current status: ${current.status})`,
          );
        }
        throw new BadRequestException(
          'Quest has reached its maximum completions',
        );
      }
      throw err;
    }

    // Saved cannot be undefined here because the transaction either
    // committed (saved was set) or threw (caught above).
    if (!saved) {
      throw new InternalServerErrorException(
        'Submission save failed inside transaction',
      );
    }

    this.eventEmitter.emit(
      'submission.created',
      new SubmissionCreatedEvent(saved.id, questId, userId),
    );
    this.metricsService.incrementCounter('submission_create_total');

    this.logger.log(
      `Submission ${saved.id} created for quest=${questId} by user=${userId}`,
    );

    return saved;
  }

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
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    const quest = submission.quest as Quest;
    const user = submission.user as User;

    // Resolve the verifier to a Stellar public key BEFORE the DB CAS update.
    // The chain expects a Stellar Address (`G…`) for the verifier argument,
    // NOT a backend user UUID, and `new Address('uuid')` in the SDK throws on
    // construction. Performing this lookup pre-CAS ensures a missing verifier
    // record or an unlinked verifier stellarAddress surfaces as the right
    // exception type without leaving the submission row in a phantom
    // APPROVED state (which the post-CAS chain-failure rollback path cannot
    // reach for these failure modes).
    const verifier = await this.usersRepository.findOne({
      where: { id: verifierId },
      relations: [],
    });
    if (!verifier) {
      throw new ForbiddenException(`Verifier with id ${verifierId} not found`);
    }
    if (!verifier.stellarAddress) {
      throw new BadRequestException(
        'Verifier does not have a Stellar address linked; cannot sign on their behalf',
      );
    }

    await this.validateVerifierAuthorization(
      quest.id,
      verifierId,
      verifier.stellarAddress ?? undefined,
    );
    this.validateStatusTransition(submission.status, 'APPROVED');

    // Validate the submitter has a Stellar address linked BEFORE we mutate
    // any DB state. Without this gate, a submission whose submitter has not
    // linked a wallet would be marked APPROVED locally but never settle on
    // chain, leaving the row stuck without a tx hash and without a recoverable
    // path forward.
    if (!user.stellarAddress) {
      throw new BadRequestException(
        'Submitter does not have a Stellar address linked',
      );
    }

    const approvedAt = new Date();

    // Calculate review duration for SLA tracking
    const reviewDurationSeconds =
      (approvedAt.getTime() - submission.createdAt.getTime()) / 1000;

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

    // Capture the row's pre-approval status so we can roll back reliably if
    // the on-chain call fails. Anything in `approveDto` that we already
    // persisted (notes, etc.) is intentionally left in place — notes are
    // verifier context, not approval state, and losing them on chain error
    // would be more harmful than keeping them.
    const previousStatus = submission.status;

    let onChainTxHash: string | undefined;
    try {
      const onChainResult = await this.stellarService.approveSubmission(
        quest.contractTaskId,
        user.stellarAddress,
        verifier.stellarAddress,
      );
      onChainTxHash = onChainResult.transactionHash;
    } catch (error) {
      // Roll the DB status back so the submission remains actionable.
      // We deliberately keep verifierNotes (verifier's review context)
      // and approvedAt/approvedBy cleared, which yields the same
      // observable state as if the call had never been attempted.
      await this.submissionsRepository.update(submissionId, {
        status: previousStatus,
        approvedBy: undefined,
        approvedAt: undefined,
      });
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `On-chain approve_submission failed for submission=${submissionId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.metricsService.incrementCounter(
        'submission_approval_chain_failure_total',
      );
      // Re-throw with the typed exception the caller expects; preserve the
      // underlying message so operators can diagnose from the API response.
      throw new BadRequestException(
        `Failed to process on-chain approval: ${errorMessage}`,
      );
    }

    if (onChainTxHash) {
      await this.submissionsRepository.update(submissionId, {
        transactionHash: onChainTxHash,
      });
      submission.transactionHash = onChainTxHash;
    }

    // Apply the persisted changes to the in-memory entity instead of
    // re-fetching the submission and its relations from the database.
    submission.status = 'APPROVED';
    submission.approvedBy = verifierId;
    submission.approvedAt = approvedAt;
    if (approveDto.notes !== undefined) {
      submission.verifierNotes = approveDto.notes;
    }

    await (this.notificationsService as any).sendSubmissionApproved?.(
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

    // Emit SLA metrics for submission review time
    this.metricsService.incrementCounter('submission_review_total');
    this.metricsService.incrementCounter('submission_approval_total');
    this.metricsService.observeHistogram(
      'submission_review_duration_seconds',
      reviewDurationSeconds,
      {
        status: 'approved',
        quest_id: submission.questId,
      },
    );

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

    const verifier = await this.usersRepository.findOne({
      where: { id: verifierId },
      relations: [],
    });
    if (!verifier) {
      throw new ForbiddenException(`Verifier with id ${verifierId} not found`);
    }

    await this.validateVerifierAuthorization(
      quest.id,
      verifierId,
      verifier.stellarAddress ?? undefined,
    );
    this.validateStatusTransition(submission.status, 'REJECTED');

    if (!rejectDto.reason || rejectDto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const rejectedAt = new Date();

    // Calculate review duration for SLA tracking
    const reviewDurationSeconds =
      (rejectedAt.getTime() - submission.createdAt.getTime()) / 1000;

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

    await (this.notificationsService as any).sendSubmissionRejected?.(
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

    // Emit SLA metrics for submission review time
    this.metricsService.incrementCounter('submission_review_total');
    this.metricsService.incrementCounter('submission_rejection_total');
    this.metricsService.observeHistogram(
      'submission_review_duration_seconds',
      reviewDurationSeconds,
      {
        status: 'rejected',
        quest_id: submission.questId,
      },
    );

    return submission;
  }

  private async validateVerifierAuthorization(
    questId: string,
    verifierId: string,
    verifierStellarAddress?: string,
  ): Promise<void> {
    const quest = await this.getQuestWithVerifiers(questId);

    const isAuthorized =
      quest.verifiers.some((v) => v.id === verifierId) ||
      quest.createdBy === (verifierStellarAddress || verifierId) ||
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

  private async getQuestWithVerifiers(
    questId: string,
  ): Promise<QuestWithVerifiers> {
    const quest = await this.questsRepository.findOne({
      where: { id: questId },
    });
    return {
      id: questId,
      verifiers: quest?.verifiers ?? [],
      createdBy: quest?.createdBy ?? '',
    };
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
