use soroban_sdk::{contracttype, Address, Env, Symbol};

use crate::errors::Error;

/// Supported asset types for multi-asset quest rewards
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AssetType {
    /// Native Stellar XLM token
    Native,
    /// USDC stablecoin
    Usdc,
    /// Custom project or community token
    Custom,
}

/// Configuration for a supported reward asset
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetConfig {
    /// On-chain address of the token contract
    pub address: Address,
    /// Classification of the asset
    pub asset_type: AssetType,
    /// Minimum allowed reward amount in the token's base unit
    pub min_amount: i128,
}

/// Return the canonical symbol string for a given asset type
pub fn asset_symbol(env: &Env, asset_type: &AssetType) -> Symbol {
    match asset_type {
        AssetType::Native => Symbol::new(env, "XLM"),
        AssetType::Usdc => Symbol::new(env, "USDC"),
        AssetType::Custom => Symbol::new(env, "CUSTOM"),
    }
}

/// Validate that a proposed reward amount satisfies the asset's minimum requirement
pub fn validate_reward_amount(config: &AssetConfig, amount: i128) -> Result<(), Error> {
    if amount <= 0 || amount < config.min_amount {
        return Err(Error::InvalidRewardAmount);
    }
    Ok(())
}
