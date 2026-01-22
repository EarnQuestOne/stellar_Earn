
use soroban_sdk::{contract, contractimpl, Env};
mod types;
mod storage;
mod quest;
mod submission;
mod payout;
mod reputation;
mod errors;

use errors::Error;

pub struct EarnQuestContract;


impl EarnQuestContract {
    pub fn register_quest(
        _env: Env,
        _id: types::Symbol,
        _creator: types::Address,
        _reward_asset: types::Address,
        _reward_amount: i128,
        _verifier: types::Address,
        _deadline: u64,
    ) -> Result<(), Error> {
        Ok(())
    }
}
