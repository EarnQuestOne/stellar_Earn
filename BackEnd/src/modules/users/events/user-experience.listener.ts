import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { ISubmissionApprovedEvent } from '../../../events/interfaces/submission-events.interface';
import { UsersService } from '../users.service';
import { EventStore } from '../../../events/entities/event-store.entity';

@Injectable()
export class UserExperienceListener {
  private readonly logger = new Logger(UserExperienceListener.name);
  private static readonly SUBMISSION_APPROVAL_XP = 100;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UsersService,
  ) {}

  @OnEvent('submission.approved', { async: true })
  async handleSubmissionApproved(event: ISubmissionApprovedEvent) {
    this.logger.log(
      `[UserModule] Awarding experience to user: ${event.userId}`,
    );
    const now = new Date();

    const result = await this.userService.applyReputationDeltaAtomic(
      event.userId,
      UserExperienceListener.SUBMISSION_APPROVAL_XP,
      {
        persist: async (manager, update) => {
          const eventRepo = manager.getRepository(EventStore);

          await eventRepo.save(
            eventRepo.create({
              eventName: 'user.reputation-changed',
              payload: {
                userId: event.userId,
                oldReputation: update.oldXp,
                newReputation: update.newXp,
                reason: 'submission.approved',
                changedAt: now,
              },
              metadata: { source: UserExperienceListener.name },
            }),
          );

          if (update.newLevel > update.oldLevel) {
            await eventRepo.save(
              eventRepo.create({
                eventName: 'user.level-up',
                payload: {
                  userId: event.userId,
                  oldLevel: update.oldLevel,
                  newLevel: update.newLevel,
                  levelUpAt: now,
                },
                metadata: { source: UserExperienceListener.name },
              }),
            );
          }
        },
      },
    );

    // Best-effort fan-out: persistence already happened in the transaction.
    try {
      this.eventEmitter.emit('user.reputation-changed', {
        userId: event.userId,
        oldReputation: result.oldXp,
        newReputation: result.newXp,
        reason: 'submission.approved',
        changedAt: now,
      });

      if (result.newLevel > result.oldLevel) {
        this.eventEmitter.emit('user.level-up', {
          userId: event.userId,
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          levelUpAt: now,
        });
      }
    } catch (error) {
      this.logger.error(
        `Reputation fan-out failed for user ${event.userId}: ${error.message}`,
      );
    }
  }
}
