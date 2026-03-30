import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebsocketService } from '../../modules/websocket/websocket.service';
import { WsChannel } from '../../modules/websocket/entities/ws-subscription.entity';
import { QuestCreatedEvent } from '../dto/quest-created.event';
import { QuestCompletedEvent } from '../dto/quest-completed.event';
import { QuestUpdatedEvent } from '../dto/quest-updated.event';
import { QuestDeletedEvent } from '../dto/quest-deleted.event';
import { SubmissionApprovedEvent } from '../dto/submission-approved.event';
import { SubmissionRejectedEvent } from '../dto/submission-rejected.event';
import { SubmissionReceivedEvent } from '../dto/submission-received.event';
import { PayoutProcessedEvent } from '../dto/payout-processed.event';
import { PayoutFailedEvent } from '../dto/payout-failed.event';
import { ReputationChangedEvent } from '../dto/reputation-changed.event';

@Injectable()
export class WebsocketEventHandler {
  private readonly logger = new Logger(WebsocketEventHandler.name);

  constructor(private readonly wsService: WebsocketService) {}

  // --- Quest Events ---

  @OnEvent('quest.created', { async: true })
  async handleQuestCreated(event: QuestCreatedEvent) {
    this.logger.debug(`WS push: quest.created ${event.questId}`);
    await this.wsService.sendToChannel(
      WsChannel.QUEST_NEW,
      'quest:created',
      {
        questId: event.questId,
        title: event.title,
        creatorAddress: event.creatorAddress,
        rewardAmount: event.rewardAmount,
      },
    );
  }

  @OnEvent('quest.updated', { async: true })
  async handleQuestUpdated(event: QuestUpdatedEvent) {
    this.logger.debug(`WS push: quest.updated ${event.questId}`);
    await this.wsService.sendToChannel(
      WsChannel.QUEST_UPDATED,
      'quest:updated',
      { questId: event.questId },
      event.questId,
    );
  }

  @OnEvent('quest.completed', { async: true })
  async handleQuestCompleted(event: QuestCompletedEvent) {
    this.logger.debug(`WS push: quest.completed ${event.questId}`);
    await this.wsService.sendToUser(
      event.userId,
      'quest:completed',
      {
        questId: event.questId,
        userId: event.userId,
      },
      WsChannel.QUEST_NEW,
    );
  }

  @OnEvent('quest.deleted', { async: true })
  async handleQuestDeleted(event: QuestDeletedEvent) {
    this.logger.debug(`WS push: quest.deleted ${event.questId}`);
    await this.wsService.sendToChannel(
      WsChannel.QUEST_UPDATED,
      'quest:deleted',
      { questId: event.questId },
      event.questId,
    );
  }

  // --- Submission Events ---

  @OnEvent('submission.received', { async: true })
  async handleSubmissionReceived(event: SubmissionReceivedEvent) {
    this.logger.debug(`WS push: submission.received ${event.submissionId}`);
    await this.wsService.sendToChannel(
      WsChannel.SUBMISSION_STATUS,
      'submission:received',
      {
        submissionId: event.submissionId,
        questId: event.questId,
        userId: event.userId,
      },
      event.questId,
    );
  }

  @OnEvent('submission.approved', { async: true })
  async handleSubmissionApproved(event: SubmissionApprovedEvent) {
    this.logger.debug(`WS push: submission.approved ${event.submissionId}`);
    await this.wsService.sendToChannel(
      WsChannel.SUBMISSION_STATUS,
      'submission:approved',
      {
        submissionId: event.submissionId,
        questId: event.questId,
        verifierId: event.verifierId,
      },
      event.questId,
    );
  }

  @OnEvent('submission.rejected', { async: true })
  async handleSubmissionRejected(event: SubmissionRejectedEvent) {
    this.logger.debug(`WS push: submission.rejected ${event.submissionId}`);
    await this.wsService.sendToUser(
      event.userId,
      'submission:rejected',
      {
        submissionId: event.submissionId,
        reason: event.reason,
      },
      WsChannel.SUBMISSION_STATUS,
    );
  }

  // --- Payout Events ---

  @OnEvent('payout.processed', { async: true })
  async handlePayoutProcessed(event: PayoutProcessedEvent) {
    this.logger.debug(`WS push: payout.processed ${event.payoutId}`);
    await this.wsService.sendToUser(
      event.stellarAddress,
      'payout:processed',
      {
        payoutId: event.payoutId,
        amount: event.amount,
        transactionHash: event.transactionHash,
      },
      WsChannel.PAYOUT_CONFIRMATION,
    );
  }

  @OnEvent('payout.failed', { async: true })
  async handlePayoutFailed(event: PayoutFailedEvent) {
    this.logger.debug(`WS push: payout.failed ${event.payoutId}`);
    await this.wsService.sendToUser(
      event.stellarAddress,
      'payout:failed',
      {
        payoutId: event.payoutId,
        reason: event.reason,
      },
      WsChannel.PAYOUT_CONFIRMATION,
    );
  }

  // --- Reputation Events ---

  @OnEvent('reputation.changed', { async: true })
  async handleReputationChanged(event: ReputationChangedEvent) {
    this.logger.debug(`WS push: reputation.changed ${event.userId}`);
    await this.wsService.sendToUser(
      event.userId,
      'reputation:changed',
      {
        change: event.change,
        newReputation: event.newReputation,
      },
      WsChannel.REPUTATION_CHANGE,
    );
  }
}
