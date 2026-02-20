#![allow(unused)]
use soroban_sdk::{Env, Symbol, Address, BytesN, symbol_short};
use crate::types::Badge;

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

/// Emit when a new quest is created
pub fn quest_registered(
    env: &Env,
    quest_id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
) {
    // Topics: [EventName, QuestID, Creator]
    let topics = (TOPIC_QUEST_REGISTERED, quest_id, creator);
    // Data: (Asset, Amount, Verifier, Deadline)
    let data = (reward_asset, reward_amount, verifier, deadline);
    env.events().publish(topics, data);
}

/// Emit when contract is paused by admin
pub fn emergency_paused(env: &Env, by: Address) {
    let topics = (TOPIC_EMERGENCY_PAUSED, by.clone());
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when contract is unpaused
pub fn emergency_unpaused(env: &Env, by: Address) {
    let topics = (TOPIC_EMERGENCY_UNPAUSED, by.clone());
    let data = (by,);
    env.events().publish(topics, data);
}

/// Emit when emergency withdrawal happens
pub fn emergency_withdrawn(env: &Env, by: Address, asset: Address, to: Address, amount: i128) {
    let topics = (TOPIC_EMERGENCY_WITHDRAW, by.clone());
    let data = (asset, to, amount);
    env.events().publish(topics, data);
}

/// Emit when an admin approves unpause
pub fn unpause_approved(env: &Env, admin: Address) {
    let topics = (TOPIC_UNPAUSE_APPROVED, admin.clone());
    let data = (admin,);
    env.events().publish(topics, data);
}

/// Emit when a timelock is scheduled for unpause
pub fn timelock_scheduled(env: &Env, scheduled_time: u64) {
    let topics = (TOPIC_TIMELOCK_SCHEDULED, scheduled_time);
    let data = (scheduled_time,);
    env.events().publish(topics, data);
}

/// Emit when a user submits a proof
pub fn proof_submitted(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
) {
    // Topics: [EventName, QuestID, Submitter]
    let topics = (TOPIC_PROOF_SUBMITTED, quest_id, submitter);
    // Data: (ProofHash)
    let data = (proof_hash,);
    env.events().publish(topics, data);
}

/// Emit when a verifier approves a submission
pub fn submission_approved(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) {
    // Topics: [EventName, QuestID, Submitter]
    let topics = (TOPIC_SUBMISSION_APPROVED, quest_id, submitter);
    // Data: (Verifier)
    let data = (verifier,);
    env.events().publish(topics, data);
}

/// Emit when a user claims their reward
pub fn reward_claimed(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    reward_asset: Address,
    reward_amount: i128,
) {
    // Topics: [EventName, QuestID, Submitter]
    let topics = (TOPIC_REWARD_CLAIMED, quest_id, submitter);
    // Data: (Asset, Amount)
    let data = (reward_asset, reward_amount);
    env.events().publish(topics, data);
}

/// Emit when XP is awarded to a user
pub fn xp_awarded(
    env: &Env,
    user: Address,
    xp_amount: u64,
    total_xp: u64,
    level: u32,
) {
    // Topics: [EventName, User]
    let topics = (TOPIC_XP_AWARDED, user);
    // Data: (XP Amount, Total XP, Level)
    let data = (xp_amount, total_xp, level);
    env.events().publish(topics, data);
}

/// Emit when a user levels up
pub fn level_up(
    env: &Env,
    user: Address,
    new_level: u32,
) {
    // Topics: [EventName, User]
    let topics = (TOPIC_LEVEL_UP, user);
    // Data: (New Level)
    let data = (new_level,);
    env.events().publish(topics, data);
}

/// Emit when a badge is granted to a user
pub fn badge_granted(
    env: &Env,
    user: Address,
    badge: Badge,
) {
    // Topics: [EventName, User]
    let topics = (TOPIC_BADGE_GRANTED, user);
    // Data: (Badge)
    let data = (badge,);
    env.events().publish(topics, data);
}