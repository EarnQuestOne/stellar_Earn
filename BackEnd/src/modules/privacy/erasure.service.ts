import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ErasureRequest,
  ErasureStatus,
} from './entities/erasure-request.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { Submission } from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ModerationItem } from '../moderation/entities/moderation-item.entity';
import { EventStore } from '../../events/entities/event-store.entity';
import { erasureTombstone } from './entities/erasure-request.entity';

export interface RequestErasureOptions {
  /** Id of the actor creating the request (subject or admin). */
  requestedBy?: string;
  /** Modules to include; defaults to the full scope. */
  scope?: string[];
  /** Operator/legal reason. */
  reason?: string;
}

export const DEFAULT_ERASURE_SCOPE = [
  'users',
  'submissions',
  'notifications',
  'payouts',
  'moderation',
];

/**
 * Grace period before an erasure executes (ms). Reversible/cancellable within
 * this window. Overridable via ERASURE_GRACE_PERIOD_MS (default: 7 days).
 */
export function erasureGracePeriodMs(): number {
  const parsed = parseInt(process.env.ERASURE_GRACE_PERIOD_MS || '', 10);
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : 7 * 24 * 60 * 60 * 1000;
}

/**
 * Right-to-erasure pipeline.
 *
 * Models the request lifecycle (request → cancellable grace period → execute →
 * completed), performs the cross-module PII anonymization inside a single
 * transaction, and is safe to re-run (idempotent).
 */
@Injectable()
export class ErasureService {
  private readonly logger = new Logger(ErasureService.name);

  constructor(
    @InjectRepository(ErasureRequest)
    private readonly erasureRepo: Repository<ErasureRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(ModerationItem)
    private readonly moderationRepo: Repository<ModerationItem>,
    @InjectRepository(EventStore)
    private readonly eventStoreRepo: Repository<EventStore>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly submissionsService: SubmissionsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit an erasure request. The request enters the grace period and a
   * delayed BullMQ job (scheduled for `scheduledFor`) is enqueued via the
   * `privacy.erasure.requested` event.
   */
  async requestErasure(
    subjectId: string,
    options: RequestErasureOptions = {},
  ): Promise<ErasureRequest> {
    const user = await this.userRepo.findOne({ where: { id: subjectId } });
    if (!user) {
      throw new NotFoundException(`User ${subjectId} not found`);
    }

    const active = await this.erasureRepo.findOne({
      where: {
        subjectId,
        status: In([ErasureStatus.REQUESTED, ErasureStatus.PROCESSING]),
      },
    });
    if (active) {
      throw new ConflictException(
        `An erasure request for user ${subjectId} is already ${active.status.toLowerCase()}`,
      );
    }

    const now = new Date();
    const scheduledFor = new Date(now.getTime() + erasureGracePeriodMs());
    const request = this.erasureRepo.create({
      subjectId,
      requestedBy: options.requestedBy ?? null,
      status: ErasureStatus.REQUESTED,
      requestedAt: now,
      scheduledFor,
      scope: options.scope ?? DEFAULT_ERASURE_SCOPE,
      reason: options.reason ?? null,
    });
    const saved = await this.erasureRepo.save(request);

    this.eventEmitter.emit('privacy.erasure.requested', {
      requestId: saved.id,
      subjectId,
      scheduledFor: scheduledFor.toISOString(),
    });

    this.logger.log(
      `Erasure request ${saved.id} created for user ${subjectId}, scheduled for ${scheduledFor.toISOString()}`,
    );
    return saved;
  }

  /**
   * Cancel an erasure request within the grace window. Only the subject or an
   * admin may cancel. Once the grace period has elapsed the request can no
   * longer be cancelled (the worker will execute it).
   */
  async cancelErasure(
    requestId: string,
    actor: { id: string; role?: string },
  ): Promise<ErasureRequest> {
    const request = await this.erasureRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`Erasure request ${requestId} not found`);
    }

    const isSubject = request.subjectId === actor.id;
    const isAdmin = actor.role === 'ADMIN';
    if (!isSubject && !isAdmin) {
      throw new BadRequestException(
        'Only the requesting user or an admin can cancel an erasure request',
      );
    }

    if (request.status !== ErasureStatus.REQUESTED) {
      throw new BadRequestException(
        `Erasure request ${requestId} is ${request.status.toLowerCase()} and cannot be cancelled`,
      );
    }

    if (new Date() >= request.scheduledFor) {
      throw new BadRequestException(
        'The grace period has elapsed; the erasure can no longer be cancelled',
      );
    }

    request.status = ErasureStatus.CANCELLED;
    request.cancelledAt = new Date();
    const saved = await this.erasureRepo.save(request);

    this.eventEmitter.emit('privacy.erasure.cancelled', {
      requestId,
      subjectId: request.subjectId,
    });
    this.logger.log(
      `Erasure request ${requestId} cancelled within grace window`,
    );
    return saved;
  }

  /**
   * Read the status of an erasure request. The subject and admins may read any
   * request; other actors are limited to their own requests.
   */
  async getStatus(
    requestId: string,
    actor: { id: string; role?: string },
  ): Promise<ErasureRequest> {
    const request = await this.erasureRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`Erasure request ${requestId} not found`);
    }
    const isSubject = request.subjectId === actor.id;
    const isAdmin = actor.role === 'ADMIN';
    if (!isSubject && !isAdmin) {
      throw new BadRequestException(
        'You are not authorized to view this erasure request',
      );
    }
    return request;
  }

  /**
   * Execute an erasure. Called by the account-erasure BullMQ processor after
   * the grace period has elapsed.
   *
   * Idempotency / safe re-run:
   *  - COMPLETED requests are a no-op.
   *  - CANCELLED / FAILED requests are skipped.
   *  - A conditional claim (REQUESTED|PROCESSING → PROCESSING) runs inside the
   *    transaction, so a concurrent or repeated run cannot double-execute and a
   *    failed transaction rolls the claim back for a clean retry.
   *
   * All per-module anonymization happens inside a single transaction:
   *  - users        : email / stellarAddress / profile PII → tombstone values,
   *                   the row is retained so FKs and aggregate stats stay valid.
   *  - submissions  : submitter PII and proof references detached; quest
   *                   integrity and reviewer decisions preserved.
   *  - notifications: rows deleted.
   *  - payouts      : retained for compliance but de-identified — the actor
   *                   identifier is replaced with the tombstone.
   *  - moderation   : submitter PII detached from moderation notes.
   *  - audit        : an erasure audit record is written to the event store.
   */
  async executeErasure(requestId: string): Promise<{
    requestId: string;
    status: ErasureStatus;
    skipped?: boolean;
    alreadyExecuted?: boolean;
  }> {
    const request = await this.erasureRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(`Erasure request ${requestId} not found`);
    }

    if (request.status === ErasureStatus.COMPLETED) {
      return {
        requestId,
        status: ErasureStatus.COMPLETED,
        alreadyExecuted: true,
      };
    }
    if (
      request.status === ErasureStatus.CANCELLED ||
      request.status === ErasureStatus.FAILED
    ) {
      return { requestId, status: request.status, skipped: true };
    }
    if (
      request.status === ErasureStatus.REQUESTED &&
      new Date() < request.scheduledFor
    ) {
      throw new BadRequestException(
        `Erasure request ${requestId} is still within its grace period`,
      );
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // ── Claim the request (idempotent under concurrency) ──────────────
        const claim = await manager.update(
          ErasureRequest,
          {
            id: requestId,
            status: In([ErasureStatus.REQUESTED, ErasureStatus.PROCESSING]),
          },
          { status: ErasureStatus.PROCESSING },
        );
        if (!claim.affected) {
          return; // claimed/executed by a concurrent run — nothing to do
        }

        // Capture the pre-anonymization user so retained financial records can
        // be re-pointed at the tombstone.
        const user = await manager.getRepository(User).findOne({
          where: { id: request.subjectId },
        });
        if (!user) {
          throw new NotFoundException(`User ${request.subjectId} not found`);
        }
        const { stellarAddress } = user;

        // ── Per-module anonymization policies (same transaction) ──────────
        await this.usersService.anonymizeForErasure(request.subjectId, manager);
        await this.submissionsService.anonymizeForErasure(
          request.subjectId,
          manager,
        );

        await manager.getRepository(Notification).delete({
          userId: request.subjectId,
        });

        if (stellarAddress) {
          await manager
            .getRepository(Payout)
            .update(
              { stellarAddress },
              { stellarAddress: erasureTombstone(request.subjectId) },
            );
        }

        await manager.getRepository(ModerationItem).update(
          { userId: request.subjectId },
          {
            textSnapshot: null,
            imageUrls: null,
            keywordHits: null,
            imageFlags: null,
            notes: null,
          },
        );

        // ── Audit record of the erasure itself ─────────────────────────────
        const audit = manager.getRepository(EventStore).create({
          eventName: 'privacy.erasure.executed',
          source: 'application',
          sourceId: requestId,
          payload: {
            requestId,
            subjectId: request.subjectId,
            requestedBy: request.requestedBy,
            scope: request.scope,
          },
          metadata: { erasure: true },
          timestamp: new Date(),
        });
        await manager.getRepository(EventStore).save(audit);

        // ── Mark completed ─────────────────────────────────────────────────
        await manager.update(
          ErasureRequest,
          { id: requestId },
          { status: ErasureStatus.COMPLETED, executedAt: new Date() },
        );
      });

      this.logger.log(
        `Erasure request ${requestId} executed for user ${request.subjectId}`,
      );
      return { requestId, status: ErasureStatus.COMPLETED };
    } catch (error) {
      // A failed transaction rolled back the claim, so the job can safely retry.
      this.logger.error(
        `Erasure request ${requestId} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
