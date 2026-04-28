#![allow(unused)]
use crate::types::Badge;
use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol};

// Event Topics (Names)
const TOPIC_QUEST_REGISTERED: Symbol = symbol_short!("quest_reg");
const TOPIC_PROOF_SUBMITTED: Symbol = symbol_short!("proof_sub");
const TOPIC_SUBMISSION_APPROVED: Symbol = symbol_short!("sub_appr");
const TOPIC_REWARD_CLAIMED: Symbol = symbol_short!("claimed");
const TOPIC_XP_AWARDED: Symbol = symbol_short!("xp_award");
const TOPIC_LEVEL_UP: Symbol = symbol_short!("level_up");
const TOPIC_BADGE_GRANTED: Symbol = symbol_short!("badge_grt");
const TOPIC_EMERGENCY_PAUSED: Symbol = symbol_short!("epause");
const TOPIC_EMERGENCY_UNPAUSED: Symbol = symbol_short!("eunpause");
const TOPIC_EMERGENCY_WITHDRAW: Symbol = symbol_short!("ewdraw");
const TOPIC_UNPAUSE_APPROVED: Symbol = symbol_short!("uappr");
const TOPIC_TIMELOCK_SCHEDULED: Symbol = symbol_short!("tl_sched");
const TOPIC_QUEST_PAUSED: Symbol = symbol_short!("q_pause");
const TOPIC_QUEST_RESUMED: Symbol = symbol_short!("q_resume");
const TOPIC_QUEST_CANCELLED: Symbol = symbol_short!("q_cancel");
const TOPIC_DISPUTE_OPENED: Symbol = symbol_short!("disp_open");
const TOPIC_DISPUTE_RESOLVED: Symbol = symbol_short!("disp_res");
const TOPIC_DISPUTE_WITHDRAWN: Symbol = symbol_short!("disp_wd");
const TOPIC_DISPUTE_APPEALED: Symbol = symbol_short!("disp_appl");
const TOPIC_ESCROW_DEPOSITED: Symbol = symbol_short!("esc_dep");
const TOPIC_ESCROW_PAYOUT: Symbol = symbol_short!("esc_pay");
const TOPIC_ESCROW_REFUNDED: Symbol = symbol_short!("esc_ref");
const TOPIC_COMMITMENT_SUBMITTED: Symbol = symbol_short!("com_sub");
const TOPIC_SUBMISSION_REVEALED: Symbol = symbol_short!("sub_rev");

// ═══════════════════════════════════════════════════════════════
// Enhanced Event Emission with Indexing for Subgraph/Indexer Integration
// ═══════════════════════════════════════════════════════════════
// 
// Event Schema:
//   Topics: [EventName, IndexedField1, IndexedField2, ...]
//   Data: { NonIndexedFields... }
//
// Indexed Fields (in topics) enable efficient off-chain filtering:
//   - QuestCreated: creator, reward_asset (indexed for querying by creator/token)
//   - SubmissionReceived: quest_id, submitter (indexed for user/quest lookups)
//   - PayoutCompleted: recipient, reward_asset (indexed for payment tracking)
//   - ReputationChanged: user (indexed for user activity)
//   - QuestCompleted: quest_id (indexed for completion tracking)
// ═══════════════════════════════════════════════════════════════

/// Emit when a new quest is created (indexed: creator, reward_asset).
///
/// # Indexing Benefits
/// * Filter quests by creator address efficiently
/// * Filter quests by reward token
/// * Subgraph can index all quests for a specific creator
pub fn quest_registered(
    env: &Env,
    quest_id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
) {
    // Topics: [EventName, QuestID, Creator, RewardAsset] - all indexed
    let topics = (TOPIC_QUEST_REGISTERED, quest_id, creator.clone(), reward_asset.clone());
    // Data: non-indexed fields for display/validation
    let data = (reward_amount, verifier, deadline);
    env.events().publish(topics, data);
}

/// Emit when contract is paused by admin (indexed: by).
///
/// # Indexing Benefits
/// * Track who paused the contract
/// * Monitor emergency actions
pub fn emergency_paused(env: &Env, by: Address) {
    // Topics: [EventName, By] - indexed
    let topics = (TOPIC_EMERGENCY_PAUSED, by.clone());
    // Data: admin info
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when contract is unpaused (indexed: by).
///
/// # Indexing Benefits
/// * Track who unpaused the contract
/// * Monitor recovery actions
pub fn emergency_unpaused(env: &Env, by: Address) {
    // Topics: [EventName, By] - indexed
    let topics = (TOPIC_EMERGENCY_UNPAUSED, by.clone());
    // Data: admin info
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when emergency withdrawal happens (indexed: by, to).
///
/// # Indexing Benefits
/// * Track emergency withdrawals
/// * Monitor fund movements
pub fn emergency_withdrawn(env: &Env, by: Address, asset: Address, to: Address, amount: i128) {
    // Topics: [EventName, By, Asset, To] - all indexed for tracking
    let topics = (TOPIC_EMERGENCY_WITHDRAW, by.clone(), asset.clone(), to.clone());
    // Data: amount
    let data = (amount,);
    env.events().publish(topics, data);
}

/// Emit when an admin approves unpause (indexed: admin).
///
/// # Indexing Benefits
/// * Track admin approval activity
/// * Monitor unpause process
pub fn unpause_approved(env: &Env, admin: Address) {
    // Topics: [EventName, Admin] - indexed
    let topics = (TOPIC_UNPAUSE_APPROVED, admin.clone());
    // Data: admin info
    let data = (admin,);
    env.events().publish(topics, data);
}

/// Emit when a timelock is scheduled for unpause (indexed: scheduled_time).
///
/// # Indexing Benefits
/// * Track scheduled unpause events
/// * Monitor timelock timing
pub fn timelock_scheduled(env: &Env, scheduled_time: u64) {
    // Topics: [EventName, ScheduledTime] - indexed by timestamp
    let topics = (TOPIC_TIMELOCK_SCHEDULED, scheduled_time);
    // Data: timestamp
    let data = (scheduled_time,);
    env.events().publish(topics, data);
}

/// Emit when a user submits a proof (indexed: quest_id, submitter).
///
/// # Indexing Benefits
/// * Filter submissions by quest ID
/// * Filter submissions by user address
/// * Track all submissions for a specific user
pub fn proof_submitted(env: &Env, quest_id: Symbol, submitter: Address, proof_hash: BytesN<32>) {
    // Topics: [EventName, QuestID, Submitter] - both indexed for efficient queries
    let topics = (TOPIC_PROOF_SUBMITTED, quest_id, submitter.clone());
    // Data: non-indexed proof data
    let data = (proof_hash,);
    env.events().publish(topics, data);
}

/// Emit when a verifier approves a submission (indexed: quest_id, submitter).
///
/// # Indexing Benefits
/// * Track approved submissions per quest
/// * Track all approvals for a user
/// * Monitor verifier activity
pub fn submission_approved(env: &Env, quest_id: Symbol, submitter: Address, verifier: Address) {
    // Topics: [EventName, QuestID, Submitter, Verifier] - indexed for lookups
    let topics = (
        TOPIC_SUBMISSION_APPROVED,
        quest_id,
        submitter.clone(),
        verifier.clone(),
    );
    // Data: empty because all filterable identity fields are indexed
    let data = ();
    env.events().publish(topics, data);
}

/// Emit when a user claims their reward (indexed: quest_id, submitter, reward_asset).
///
/// # Indexing Benefits
/// * Track payouts by quest
/// * Track user earnings
/// * Filter by token type
pub fn reward_claimed(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    reward_asset: Address,
    reward_amount: i128,
) {
    // Topics: [EventName, QuestID, Submitter, RewardAsset] - all indexed
    let topics = (TOPIC_REWARD_CLAIMED, quest_id, submitter.clone(), reward_asset.clone());
    // Data: amount for display
    let data = (reward_amount,);
    env.events().publish(topics, data);
}

/// Emit when XP is awarded to a user (indexed: user).
///
/// # Indexing Benefits
/// * Track user reputation growth
/// * Monitor XP distribution
pub fn xp_awarded(env: &Env, user: Address, xp_amount: u64, total_xp: u64, level: u32) {
    // Topics: [EventName, User] - indexed by user
    let topics = (TOPIC_XP_AWARDED, user.clone());
    // Data: XP amounts and level
    let data = (xp_amount, total_xp, level);
    env.events().publish(topics, data);
}

/// Emit when a user levels up (indexed: user).
///
/// # Indexing Benefits
/// * Track user milestones
/// * Monitor progression
pub fn level_up(env: &Env, user: Address, new_level: u32) {
    // Topics: [EventName, User] - indexed by user
    let topics = (TOPIC_LEVEL_UP, user.clone());
    // Data: new level
    let data = (new_level,);
    env.events().publish(topics, data);
}

/// Emit when a badge is granted to a user (indexed: user, badge_type).
///
/// # Indexing Benefits
/// * Track badge distribution
/// * Filter users by badge type
pub fn badge_granted(env: &Env, user: Address, badge: Badge) {
    // Topics: [EventName, User, Badge] - indexed for filtering
    let topics = (TOPIC_BADGE_GRANTED, user.clone(), badge.clone());
    // Data: empty (badge already in topics)
    let data = ();
    env.events().publish(topics, data);
}

/// Emit when tokens are deposited into escrow (indexed: quest_id, depositor).
///
/// # Indexing Benefits
/// * Track escrow deposits per quest
/// * Monitor depositor activity
pub fn escrow_deposited(
    env: &Env,
    quest_id: Symbol,
    depositor: Address,
    token: Address,
    amount: i128,
    total_balance: i128,
) {
    // Topics: [EventName, QuestID, Depositor, Token] - indexed
    let topics = (
        TOPIC_ESCROW_DEPOSITED,
        quest_id,
        depositor.clone(),
        token.clone(),
    );
    // Data: amounts
    let data = (amount, total_balance);
    env.events().publish(topics, data);
}

/// Emit when tokens are paid out from escrow (indexed: quest_id, recipient).
///
/// # Indexing Benefits
/// * Track payouts per quest
/// * Monitor recipient payments
pub fn escrow_payout(
    env: &Env,
    quest_id: Symbol,
    recipient: Address,
    token: Address,
    amount: i128,
    remaining: i128,
) {
    // Topics: [EventName, QuestID, Recipient, Token] - indexed
    let topics = (TOPIC_ESCROW_PAYOUT, quest_id, recipient.clone(), token.clone());
    // Data: amounts
    let data = (amount, remaining);
    env.events().publish(topics, data);
}

/// Emit when remaining escrow is refunded to creator (indexed: quest_id, recipient).
///
/// # Indexing Benefits
/// * Track refunds per quest
/// * Monitor creator refunds
pub fn escrow_refunded(
    env: &Env,
    quest_id: Symbol,
    recipient: Address,
    token: Address,
    amount: i128,
) {
    // Topics: [EventName, QuestID, Recipient, Token] - indexed
    let topics = (TOPIC_ESCROW_REFUNDED, quest_id, recipient.clone(), token.clone());
    // Data: amount
    let data = (amount,);
    env.events().publish(topics, data);
}

/// Emit when a quest is cancelled (indexed: quest_id, creator).
///
/// # Indexing Benefits
/// * Track cancelled quests
/// * Monitor creator cancellations
pub fn quest_cancelled(
    env: &Env,
    quest_id: Symbol,
    creator: Address,
    refunded: i128,
) {
    // Topics: [EventName, QuestID, Creator] - indexed
    let topics = (TOPIC_QUEST_CANCELLED, quest_id, creator.clone());
    // Data: refunded amount
    let data = (refunded,);
    env.events().publish(topics, data);
}

/// Emit when a quest is paused by an admin (indexed: quest_id, by).
///
/// # Indexing Benefits
/// * Track quest pauses
/// * Monitor admin actions
pub fn quest_paused(env: &Env, quest_id: Symbol, by: Address) {
    // Topics: [EventName, QuestID, By] - indexed
    let topics = (TOPIC_QUEST_PAUSED, quest_id, by.clone());
    // Data: admin info
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when a quest is resumed by an admin (indexed: quest_id, by).
///
/// # Indexing Benefits
/// * Track quest resumptions
/// * Monitor admin actions
pub fn quest_resumed(env: &Env, quest_id: Symbol, by: Address) {
    // Topics: [EventName, QuestID, By] - indexed
    let topics = (TOPIC_QUEST_RESUMED, quest_id, by.clone());
    // Data: admin info
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when a dispute is opened (indexed: quest_id, initiator, arbitrator).
///
/// # Indexing Benefits
/// * Track disputes per quest
/// * Monitor initiator and arbitrator activity
pub fn dispute_opened(env: &Env, quest_id: Symbol, initiator: Address, arbitrator: Address) {
    let topics = (TOPIC_DISPUTE_OPENED, quest_id, initiator.clone(), arbitrator.clone());
    let data = ();
    env.events().publish(topics, data);
}

/// Emit when a dispute is resolved (indexed: quest_id, initiator, arbitrator).
pub fn dispute_resolved(env: &Env, quest_id: Symbol, initiator: Address, arbitrator: Address) {
    let topics = (TOPIC_DISPUTE_RESOLVED, quest_id, initiator.clone(), arbitrator.clone());
    let data = ();
    env.events().publish(topics, data);
}

/// Emit when a dispute is withdrawn by the initiator (indexed: quest_id, initiator).
pub fn dispute_withdrawn(env: &Env, quest_id: Symbol, initiator: Address) {
    let topics = (TOPIC_DISPUTE_WITHDRAWN, quest_id, initiator.clone());
    let data = ();
    env.events().publish(topics, data);
}

pub fn dispute_appealed(env: &Env, quest_id: Symbol, initiator: Address, arbitrator: Address) {
    let topics = (TOPIC_DISPUTE_APPEALED, quest_id, initiator, arbitrator);
    let data = ();
    env.events().publish(topics, data);
}

pub fn commitment_submitted(env: &Env, quest_id: Symbol, submitter: Address, hash: BytesN<32>) {
    let topics = (TOPIC_COMMITMENT_SUBMITTED, quest_id, submitter);
    let data = (hash,);
    env.events().publish(topics, data);
}

pub fn submission_revealed(env: &Env, quest_id: Symbol, submitter: Address, proof_hash: BytesN<32>) {
    let topics = (TOPIC_SUBMISSION_REVEALED, quest_id, submitter);
    let data = (proof_hash,);
    env.events().publish(topics, data);
}
