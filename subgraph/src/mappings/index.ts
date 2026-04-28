// =============================================================================
// Event Mapping Handlers
// =============================================================================
// Processes raw Soroban events and updates entity state in the database.
// Each handler maps a specific event type to the corresponding entity changes.
// =============================================================================

import {
  saveQuest,
  saveSubmission,
  saveEscrow,
  saveDispute,
  saveUserStats,
  saveEvent as persistEvent,
  updateQuestStatus,
  incrementQuestClaims,
  updateSubmissionStatus,
  ensureUserStats,
  getQuest,
  getSubmission,
  getEscrow,
} from '../storage/database';

import {
  TOPIC_TO_NAME,
  EventTopicName,
} from '../config/topics';

import {
  QuestStatus,
  SubmissionStatus,
  DisputeStatus,
  BadgeType,
  QuestRegisteredData,
  ProofSubmittedData,
  SubmissionApprovedData,
  RewardClaimedData,
  XpAwardedData,
  LevelUpData,
  BadgeGrantedData,
  EmergencyPausedData,
  EmergencyUnpausedData,
  EmergencyWithdrawnData,
  UnpauseApprovedData,
  TimelockScheduledData,
  QuestPausedData,
  QuestResumedData,
  QuestCancelledData,
  DisputeOpenedData,
  DisputeResolvedData,
  DisputeWithdrawnData,
  DisputeAppealedData,
  EscrowDepositedData,
  EscrowPayoutData,
  EscrowRefundedData,
  CommitmentSubmittedData,
  SubmissionRevealedData,
  EventData,
} from '../config/types';

const logger = {
  info: (...args: any[]) => console.log('[Mapper]', ...args),
  error: (...args: any[]) => console.error('[Mapper]', ...args),
};

// =============================================================================
// ScVal Parsing Utilities
// =============================================================================

/**
 * Parse an ScVal value to a JS primitive.
 * Handles common Soroban types: Address, Symbol, i128, u64, u32, bytes, bool.
 */
function scValToJs(val: any): any {
  if (val === undefined || val === null) return null;

  // Already a primitive
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }

  // Soroban SDK ScVal object
  switch (val.switch?.name || val._switch?.name) {
    case 'address':
    case 'scvAddress':
      return val.address?.address?.toString() || val.value?.toString() || String(val);
    case 'scvSym':
    case 'symbol':
      return val.sym?.toString() || val.value?.toString() || String(val);
    case 'scvI128':
    case 'i128':
      return val.i128?.toString() || val.value?.toString() || String(val);
    case 'scvU64':
    case 'u64':
      return val.u64?.toString() || val.value?.toString() || String(val);
    case 'scvU32':
    case 'u32':
      return val.u32 ?? val.value ?? Number(val);
    case 'scvBytes':
    case 'bytes':
      return val.bytes?.toString('hex') || val.value?.toString('hex') || String(val);
    case 'scvBool':
    case 'bool':
      return val.bool ?? val.value ?? false;
    case 'scvVoid':
    case 'void':
      return null;
    default:
      // Fallback: try common property names
      if (val.address) return val.address.toString();
      if (val.sym) return val.sym.toString();
      if (val.i128) return val.i128.toString();
      if (val.u64) return val.u64.toString();
      if (val.u32 !== undefined) return val.u32;
      if (val.bytes) return val.bytes.toString('hex');
      if (val.bool !== undefined) return val.bool;
      return val.toString ? val.toString() : String(val);
  }
}

/**
 * Parse event topics array into JS primitives.
 * Topics[0] is always the event name symbol.
 */
function parseTopics(topics: any[]): string[] {
  return topics.map((t) => {
    const parsed = scValToJs(t);
    return String(parsed);
  });
}

/**
 * Parse event data (value field) into JS primitives.
 * Data is typically a tuple of non-indexed fields.
 */
function parseData(data: any): any[] {
  if (!data) return [];
  // If data is a tuple/vec of ScVals
  if (Array.isArray(data)) return data.map(scValToJs);
  if (data.values) return data.values.map(scValToJs);
  // Single value
  return [scValToJs(data)];
}

// =============================================================================
// Badge parsing helper
// =============================================================================

const BADGE_MAP: Record<number, BadgeType> = {
  0: BadgeType.Rookie,
  1: BadgeType.Explorer,
  2: BadgeType.Veteran,
  3: BadgeType.Master,
  4: BadgeType.Legend,
};

function parseBadge(val: any): BadgeType {
  const idx = typeof val === 'number' ? val : Number(scValToJs(val));
  return BADGE_MAP[idx] || BadgeType.Rookie;
}

// =============================================================================
// Main Event Handler — dispatches to specific handlers
// =============================================================================

export async function handleEvent(rawEvent: any): Promise<void> {
  const topicStrs = parseTopics(rawEvent.topic || rawEvent.topics || []);
  const eventTopicName = topicStrs[0]; // e.g. "quest_reg"
  const eventName = TOPIC_TO_NAME[eventTopicName];

  if (!eventName) {
    logger.info(`Unknown event topic: ${eventTopicName}, skipping`);
    return;
  }

  const dataValues = parseData(rawEvent.value?.data || rawEvent.data || rawEvent.value);
  const ledger = rawEvent.ledger || rawEvent.ledgerSequence || 0;
  const timestamp = rawEvent.ledgerTimestamp || rawEvent.ledger_close_time?.toString() || '0';
  const txHash = rawEvent.txHash || rawEvent.transactionHash || '';

  // Generate unique event ID
  const eventId = rawEvent.id || `${txHash}:${topicStrs.join(':')}:${ledger}`;

  // Persist the raw event to the events table
  persistEvent({
    id: eventId,
    eventType: eventName,
    contractId: rawEvent.contractId || '',
    topics: JSON.stringify(topicStrs),
    data: JSON.stringify(dataValues),
    ledger,
    ledgerTimestamp: String(timestamp),
    txHash,
  });

  // Dispatch to specific handler
  try {
    switch (eventName) {
      case 'QUEST_REGISTERED':
        handleQuestRegistered(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'PROOF_SUBMITTED':
        handleProofSubmitted(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'SUBMISSION_APPROVED':
        handleSubmissionApproved(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'REWARD_CLAIMED':
        handleRewardClaimed(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'XP_AWARDED':
        handleXpAwarded(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'LEVEL_UP':
        handleLevelUp(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'BADGE_GRANTED':
        handleBadgeGranted(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'EMERGENCY_PAUSED':
        handleEmergencyPaused(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'EMERGENCY_UNPAUSED':
        handleEmergencyUnpaused(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'EMERGENCY_WITHDRAW':
        handleEmergencyWithdrawn(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'UNPAUSE_APPROVED':
        handleUnpauseApproved(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'TIMELOCK_SCHEDULED':
        handleTimelockScheduled(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'QUEST_PAUSED':
        handleQuestPaused(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'QUEST_RESUMED':
        handleQuestResumed(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'QUEST_CANCELLED':
        handleQuestCancelled(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'DISPUTE_OPENED':
        handleDisputeOpened(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'DISPUTE_RESOLVED':
        handleDisputeResolved(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'DISPUTE_WITHDRAWN':
        handleDisputeWithdrawn(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'DISPUTE_APPEALED':
        handleDisputeAppealed(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'ESCROW_DEPOSITED':
        handleEscrowDeposited(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'ESCROW_PAYOUT':
        handleEscrowPayout(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'ESCROW_REFUNDED':
        handleEscrowRefunded(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'COMMITMENT_SUBMITTED':
        handleCommitmentSubmitted(topicStrs, dataValues, ledger, timestamp);
        break;
      case 'SUBMISSION_REVEALED':
        handleSubmissionRevealed(topicStrs, dataValues, ledger, timestamp);
        break;
      default:
        logger.info(`No handler for event: ${eventName}`);
    }
  } catch (err) {
    logger.error(`Error handling ${eventName}:`, err);
  }
}

// =============================================================================
// Individual Event Handlers
// =============================================================================
//
// Topics & Data mapping reference (from events.rs):
//
// Each handler maps the Soroban event structure to database entities.
// Topics = indexed fields, Data = non-indexed fields
// =============================================================================

/**
 * quest_reg: topics [quest_id, creator, reward_asset], data [reward_amount, verifier, deadline]
 */
function handleQuestRegistered(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const creator = topics[2];
  const rewardAsset = topics[3];
  const rewardAmount = String(data[0] || '0');
  const verifier = String(data[1] || '');
  const deadline = String(data[2] || '0');

  saveQuest({
    id: questId,
    creator,
    reward_asset: rewardAsset,
    reward_amount: rewardAmount,
    verifier,
    deadline,
    status: QuestStatus.Active,
    total_claims: 0,
    created_at: timestamp,
    created_in_ledger: ledger,
  });

  // Initialize escrow record
  saveEscrow({
    id: questId,
    quest_id: questId,
    depositor: creator,
    token: rewardAsset,
    total_deposited: '0',
    total_paid_out: '0',
    total_refunded: '0',
    is_active: true,
    deposit_count: 0,
    created_at: timestamp,
  });

  logger.info(`Quest registered: ${questId} by ${creator}`);
}

/**
 * proof_sub: topics [quest_id, submitter], data [proof_hash]
 */
function handleProofSubmitted(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const submitter = topics[2];
  const proofHash = String(data[0] || '');

  const submissionId = `${questId}:${submitter}`;
  saveSubmission({
    id: submissionId,
    quest_id: questId,
    submitter,
    proof_hash: proofHash,
    status: SubmissionStatus.Pending,
    timestamp,
    commitment_hash: null,
    revealed: false,
  });

  // Increment user submission count
  const stats = ensureUserStats(submitter);
  saveUserStats({
    ...stats,
    total_submissions: stats.total_submissions + 1,
  });

  logger.info(`Proof submitted: ${questId} by ${submitter}`);
}

/**
 * sub_appr: topics [quest_id, submitter, verifier], data []
 */
function handleSubmissionApproved(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const submitter = topics[2];

  const submissionId = `${questId}:${submitter}`;
  updateSubmissionStatus(submissionId, SubmissionStatus.Approved);

  logger.info(`Submission approved: ${questId} for ${submitter}`);
}

/**
 * claimed: topics [quest_id, submitter, reward_asset], data [reward_amount]
 */
function handleRewardClaimed(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const submitter = topics[2];
  const rewardAsset = topics[3];
  const rewardAmount = String(data[0] || '0');

  const submissionId = `${questId}:${submitter}`;
  updateSubmissionStatus(submissionId, SubmissionStatus.Paid);
  incrementQuestClaims(questId);

  // Update escrow payout
  const escrow = getEscrow(questId);
  if (escrow) {
    const newPaidOut = (BigInt(escrow.total_paid_out) + BigInt(rewardAmount)).toString();
    saveEscrow({
      ...escrow,
      total_paid_out: newPaidOut,
    });
  }

  // Update user stats
  const stats = ensureUserStats(submitter);
  saveUserStats({
    ...stats,
    total_payouts: stats.total_payouts + 1,
    total_payout_amount: (BigInt(stats.total_payout_amount) + BigInt(rewardAmount)).toString(),
    quests_completed: stats.quests_completed + 1,
  });

  logger.info(`Reward claimed: ${questId} for ${submitter} amount=${rewardAmount}`);
}

/**
 * xp_award: topics [user], data [xp_amount, total_xp, level]
 */
function handleXpAwarded(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const user = topics[1];
  const xpAmount = String(data[0] || '0');
  const totalXp = String(data[1] || '0');
  const level = Number(data[2] || 1);

  const stats = ensureUserStats(user);
  saveUserStats({
    ...stats,
    xp: totalXp,
    level,
  });

  logger.info(`XP awarded: ${user} +${xpAmount} total=${totalXp} level=${level}`);
}

/**
 * level_up: topics [user], data [new_level]
 */
function handleLevelUp(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const user = topics[1];
  const newLevel = Number(data[0] || 1);

  const stats = ensureUserStats(user);
  saveUserStats({
    ...stats,
    level: newLevel,
  });

  logger.info(`Level up: ${user} → ${newLevel}`);
}

/**
 * badge_grt: topics [user, badge], data []
 */
function handleBadgeGranted(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const user = topics[1];
  const badgeRaw = topics[2];
  const badge = parseBadge(badgeRaw);

  const stats = ensureUserStats(user);
  const existingBadges: string[] = JSON.parse(stats.badges);
  if (!existingBadges.includes(badge)) {
    existingBadges.push(badge);
  }
  saveUserStats({
    ...stats,
    badges: JSON.stringify(existingBadges),
  });

  logger.info(`Badge granted: ${user} → ${badge}`);
}

/**
 * epause: topics [by], data [by]
 */
function handleEmergencyPaused(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const by = topics[1];
  logger.info(`Emergency paused by ${by}`);
}

/**
 * eunpause: topics [by], data [by]
 */
function handleEmergencyUnpaused(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const by = topics[1];
  logger.info(`Emergency unpaused by ${by}`);
}

/**
 * ewdraw: topics [by, asset, to], data [amount]
 */
function handleEmergencyWithdrawn(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const by = topics[1];
  const asset = topics[2];
  const to = topics[3];
  const amount = String(data[0] || '0');

  logger.info(`Emergency withdraw: ${by} → ${to} amount=${amount} asset=${asset}`);
}

/**
 * uappr: topics [admin], data [admin]
 */
function handleUnpauseApproved(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const admin = topics[1];
  logger.info(`Unpause approved by ${admin}`);
}

/**
 * tl_sched: topics [scheduled_time], data [scheduled_time]
 */
function handleTimelockScheduled(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const scheduledTime = topics[1];
  logger.info(`Timelock scheduled for ${scheduledTime}`);
}

/**
 * q_pause: topics [quest_id, by], data [by]
 */
function handleQuestPaused(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  updateQuestStatus(questId, QuestStatus.Paused);
  logger.info(`Quest paused: ${questId}`);
}

/**
 * q_resume: topics [quest_id, by], data [by]
 */
function handleQuestResumed(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  updateQuestStatus(questId, QuestStatus.Active);
  logger.info(`Quest resumed: ${questId}`);
}

/**
 * q_cancel: topics [quest_id, creator], data [refunded]
 */
function handleQuestCancelled(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const refunded = String(data[0] || '0');

  updateQuestStatus(questId, QuestStatus.Cancelled);

  // Update escrow
  const escrow = getEscrow(questId);
  if (escrow) {
    saveEscrow({
      ...escrow,
      total_refunded: (BigInt(escrow.total_refunded) + BigInt(refunded)).toString(),
      is_active: false,
    });
  }

  logger.info(`Quest cancelled: ${questId}, refunded=${refunded}`);
}

/**
 * disp_open: topics [quest_id, initiator, arbitrator], data []
 */
function handleDisputeOpened(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const initiator = topics[2];
  const arbitrator = topics[3];

  saveDispute({
    id: `${questId}:${initiator}`,
    quest_id: questId,
    initiator,
    arbitrator,
    status: DisputeStatus.Pending,
    filed_at: timestamp,
  });

  logger.info(`Dispute opened: ${questId} by ${initiator}`);
}

/**
 * disp_res: topics [quest_id, initiator, arbitrator], data []
 */
function handleDisputeResolved(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const initiator = topics[2];

  saveDispute({
    id: `${questId}:${initiator}`,
    quest_id: questId,
    initiator,
    arbitrator: topics[3],
    status: DisputeStatus.Resolved,
    filed_at: timestamp, // will be overwritten by existing
  });

  logger.info(`Dispute resolved: ${questId}`);
}

/**
 * disp_wd: topics [quest_id, initiator], data []
 */
function handleDisputeWithdrawn(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const initiator = topics[2];

  saveDispute({
    id: `${questId}:${initiator}`,
    quest_id: questId,
    initiator,
    arbitrator: '',
    status: DisputeStatus.Withdrawn,
    filed_at: timestamp,
  });

  logger.info(`Dispute withdrawn: ${questId} by ${initiator}`);
}

/**
 * disp_appl: topics [quest_id, initiator, arbitrator], data []
 */
function handleDisputeAppealed(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const initiator = topics[2];
  const arbitrator = topics[3];

  saveDispute({
    id: `${questId}:${initiator}`,
    quest_id: questId,
    initiator,
    arbitrator,
    status: DisputeStatus.Appealed,
    filed_at: timestamp,
  });

  logger.info(`Dispute appealed: ${questId} by ${initiator}`);
}

/**
 * esc_dep: topics [quest_id, depositor, token], data [amount, total_balance]
 */
function handleEscrowDeposited(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const amount = String(data[0] || '0');
  const totalBalance = String(data[1] || '0');

  const escrow = getEscrow(questId);
  if (escrow) {
    saveEscrow({
      ...escrow,
      total_deposited: totalBalance,
      deposit_count: escrow.deposit_count + 1,
    });
  } else {
    saveEscrow({
      id: questId,
      quest_id: questId,
      depositor: topics[2],
      token: topics[3],
      total_deposited: totalBalance,
      total_paid_out: '0',
      total_refunded: '0',
      is_active: true,
      deposit_count: 1,
      created_at: timestamp,
    });
  }

  logger.info(`Escrow deposited: ${questId} amount=${amount} total=${totalBalance}`);
}

/**
 * esc_pay: topics [quest_id, recipient, token], data [amount, remaining]
 */
function handleEscrowPayout(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const amount = String(data[0] || '0');
  const remaining = String(data[1] || '0');

  const escrow = getEscrow(questId);
  if (escrow) {
    const newPaidOut = (BigInt(escrow.total_paid_out) + BigInt(amount)).toString();
    saveEscrow({
      ...escrow,
      total_paid_out: newPaidOut,
    });
  }

  logger.info(`Escrow payout: ${questId} amount=${amount} remaining=${remaining}`);
}

/**
 * esc_ref: topics [quest_id, recipient, token], data [amount]
 */
function handleEscrowRefunded(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const amount = String(data[0] || '0');

  const escrow = getEscrow(questId);
  if (escrow) {
    saveEscrow({
      ...escrow,
      total_refunded: (BigInt(escrow.total_refunded) + BigInt(amount)).toString(),
      is_active: false,
    });
  }

  logger.info(`Escrow refunded: ${questId} amount=${amount}`);
}

/**
 * com_sub: topics [quest_id, submitter], data [hash]
 */
function handleCommitmentSubmitted(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const submitter = topics[2];
  const hash = String(data[0] || '');

  const submissionId = `${questId}:${submitter}`;
  // Create or update submission with commitment hash
  const existing = getSubmission(submissionId);
  if (existing) {
    saveSubmission({
      ...existing,
      commitment_hash: hash,
    });
  } else {
    saveSubmission({
      id: submissionId,
      quest_id: questId,
      submitter,
      proof_hash: '',
      status: SubmissionStatus.Pending,
      timestamp,
      commitment_hash: hash,
      revealed: false,
    });
  }

  logger.info(`Commitment submitted: ${questId} by ${submitter}`);
}

/**
 * sub_rev: topics [quest_id, submitter], data [proof_hash]
 */
function handleSubmissionRevealed(
  topics: string[],
  data: any[],
  ledger: number,
  timestamp: string,
): void {
  const questId = topics[1];
  const submitter = topics[2];
  const proofHash = String(data[0] || '');

  const submissionId = `${questId}:${submitter}`;
  const existing = getSubmission(submissionId);
  if (existing) {
    saveSubmission({
      ...existing,
      proof_hash: proofHash,
      revealed: true,
    });
  } else {
    saveSubmission({
      id: submissionId,
      quest_id: questId,
      submitter,
      proof_hash: proofHash,
      status: SubmissionStatus.Pending,
      timestamp,
      commitment_hash: null,
      revealed: true,
    });
  }

  logger.info(`Submission revealed: ${questId} by ${submitter}`);
}
