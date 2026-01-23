use soroban_sdk::{token, Address, Env};
use crate::errors::Error;

/// Transfer rewards from the contract escrow to the user.
/// 
/// This function handles the low-level token transfer and ensures
/// the contract has sufficient balance.
pub fn transfer_reward(
    env: &Env,
    reward_asset: &Address,
    to: &Address,
    amount: i128,
) -> Result<(), Error> {
    // 0. Asset validation (basic check that it's a valid address is handled by SDK type)
    // Additional validation could be checking against a whitelist if required.

    if amount <= 0 {
        return Err(Error::InvalidRewardAmount);
    }

    let token_client = token::Client::new(env, reward_asset);
    let contract_address = env.current_contract_address();

    // 1. Balance Checking
    let balance = token_client.balance(&contract_address);
    if balance < amount {
        return Err(Error::InsufficientBalance);
    }

    // 2. Transfer logic
    // The contract authorizes this transfer as it owns the funds.
    let transfer_result = token_client.try_transfer(&contract_address, to, &amount);

    // 3. Error Handling
    match transfer_result {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(_)) => Err(Error::TransferFailed), // Token logic error
        Err(_) => Err(Error::TransferFailed),     // Cross-contract call error
    }
}
