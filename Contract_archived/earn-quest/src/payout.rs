use soroban_sdk::{Address, Env, Symbol};

use crate::errors::Error;
use crate::escrow;

/// Process a reward payout for an approved submission.
/// Validates escrow sufficiency, deducts the reward, and transfers tokens to the submitter.
pub fn process_payout(env: &Env, quest_id: &Symbol, submitter: &Address) -> Result<(), Error> {
    escrow::process_payout(env, quest_id, submitter)
}
