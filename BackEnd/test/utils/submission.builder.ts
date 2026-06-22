/**
 * SubmissionBuilder — canonical test utility for constructing Submission objects.
 *
 * Usage:
 *   const submission = new SubmissionBuilder().build();
 *   const approved  = new SubmissionBuilder().approved('verifier-1').build();
 *   const rejected  = new SubmissionBuilder().rejected('verifier-1', 'bad proof').build();
 *   const custom    = new SubmissionBuilder().withQuestId('q-99').withUserId('u-42').build();
 */

import {
  Submission,
  SubmissionStatus,
} from '#src/modules/submissions/entities/submission.entity';

export class SubmissionBuilder {
  private readonly data: Partial<Submission> = {
    id: 'submission-default-id',
    questId: 'quest-default-id',
    userId: 'user-default-id',
    proof: { fileName: 'proof.pdf', fileContent: 'base64content' },
    status: SubmissionStatus.PENDING,
    approvedBy: null,
    approvedAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    verifierNotes: null,
    transactionHash: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    user: null,
    quest: null,
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withTransactionHash(hash: string): this {
    this.data.transactionHash = hash;
    return this;
  }

  withQuestId(questId: string): this {
    this.data.questId = questId;
    return this;
  }

  withUserId(userId: string): this {
    this.data.userId = userId;
    return this;
  }

  withProof(proof: Record<string, unknown>): this {
    this.data.proof = proof;
    return this;
  }

  withStatus(status: SubmissionStatus): this {
    this.data.status = status;
    return this;
  }

  withVerifierNotes(notes: string): this {
    this.data.verifierNotes = notes;
    return this;
  }

  withUser(user: Record<string, unknown>): this {
    this.data.user = user as any;
    return this;
  }

  /**
   * Set the quest; merges with a sensible default `contractTaskId` so
   * approval-flow tests that bind `quest.contractTaskId` into a Soroban
   * `approve_submission` call don't fail at the input-validation gate.
   */
  withQuest(quest: Record<string, unknown>): this {
    this.data.quest = { contractTaskId: 'default-task-id', ...quest } as any;
    return this;
  }

  /** Transition to APPROVED state. */
  approved(verifierId: string, notes?: string): this {
    this.data.status = SubmissionStatus.APPROVED;
    this.data.approvedBy = verifierId;
    this.data.approvedAt = new Date('2026-01-02T00:00:00.000Z');
    if (notes !== undefined) {
      this.data.verifierNotes = notes;
    }
    return this;
  }

  /** Transition to REJECTED state. */
  rejected(verifierId: string, reason: string, notes?: string): this {
    this.data.status = SubmissionStatus.REJECTED;
    this.data.rejectedBy = verifierId;
    this.data.rejectedAt = new Date('2026-01-02T00:00:00.000Z');
    this.data.rejectionReason = reason;
    if (notes !== undefined) {
      this.data.verifierNotes = notes;
    }
    return this;
  }

  /** Transition to UNDER_REVIEW state. */
  underReview(): this {
    this.data.status = SubmissionStatus.UNDER_REVIEW;
    return this;
  }

  /** Transition to PAID state. */
  paid(verifierId: string): this {
    this.data.status = SubmissionStatus.PAID;
    this.data.approvedBy = verifierId;
    this.data.approvedAt = new Date('2026-01-02T00:00:00.000Z');
    return this;
  }

  build(): Submission {
    return Object.assign(new Submission(), this.data);
  }
}
