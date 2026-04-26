use crate::errors::Error;
use crate::types::{
    AggregatedPrice, OracleConfig, OracleResponse, OracleType, PriceData, PriceFeedRequest,
};
use soroban_sdk::{Address, Env, Symbol, U256};

/// Oracle module for decentralized price feeds
pub struct Oracle;

impl Oracle {
    /// Get price from a single oracle
    pub fn get_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        if !oracle_config.is_active {
            return Err(Error::OracleInactive);
        }

        match oracle_config.oracle_type {
            OracleType::StellarAsset => Self::get_stellar_asset_price(env, oracle_config, request),
            OracleType::StellarOracle => Self::get_stellar_oracle_price(env, oracle_config, request),
            OracleType::Custom => Self::get_custom_oracle_price(env, oracle_config, request),
        }
    }

    /// Get aggregated price from multiple oracles
    pub fn get_aggregated_price(
        env: &Env,
        oracle_configs: &Vec<OracleConfig>,
        request: &PriceFeedRequest,
    ) -> Result<AggregatedPrice, Error> {
        let mut valid_prices: Vec<(PriceData, u32)> = Vec::new(env);
        let mut total_sources = 0;

        for config in oracle_configs.iter() {
            total_sources += 1;
            
            if let Ok(price_data) = Self::get_price(env, config, request) {
                // Check if price is fresh enough
                let current_time = env.ledger().timestamp();
                if current_time - price_data.timestamp <= config.max_age_seconds {
                    // Check confidence threshold
                    if price_data.confidence >= config.min_confidence {
                        valid_prices.push((price_data, config.min_confidence));
                    }
                }
            }
        }

        if valid_prices.is_empty() {
            return Err(Error::NoValidOracleData);
        }

        Self::calculate_weighted_average(env, &valid_prices, total_sources, request)
    }

    /// Get price from Stellar Asset oracle
    fn get_stellar_asset_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        // Implementation for Stellar Asset oracle
        // This would interface with Stellar's built-in asset pricing
        
        // For now, return a mock implementation
        let current_time = env.ledger().timestamp();
        Ok(PriceData {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            price: U256::from_u32(1000), // Mock price
            decimals: 7,
            timestamp: current_time,
            confidence: 95,
        })
    }

    /// Get price from Stellar Oracle contract
    fn get_stellar_oracle_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        // Implementation for Stellar Oracle contract
        // This would call an external oracle contract
        
        // For now, return a mock implementation
        let current_time = env.ledger().timestamp();
        Ok(PriceData {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            price: U256::from_u32(1050), // Mock price
            decimals: 7,
            timestamp: current_time,
            confidence: 90,
        })
    }

    /// Get price from custom oracle implementation
    fn get_custom_oracle_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        // Implementation for custom oracle
        // This would call a user-defined oracle contract
        
        // For now, return a mock implementation
        let current_time = env.ledger().timestamp();
        Ok(PriceData {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            price: U256::from_u32(1025), // Mock price
            decimals: 7,
            timestamp: current_time,
            confidence: 85,
        })
    }

    /// Calculate weighted average of multiple price sources
    fn calculate_weighted_average(
        env: &Env,
        valid_prices: &Vec<(PriceData, u32)>,
        total_sources: u32,
        request: &PriceFeedRequest,
    ) -> Result<AggregatedPrice, Error> {
        let mut weighted_sum = U256::from_u32(0);
        let mut total_weight = 0u32;
        let mut confidence_sum = 0u32;

        for (price_data, weight) in valid_prices.iter() {
            weighted_sum += price_data.price * U256::from_u32(*weight);
            total_weight += weight;
            confidence_sum += price_data.confidence;
        }

        if total_weight == 0 {
            return Err(Error::InvalidOracleConfiguration);
        }

        let weighted_price = weighted_sum / U256::from_u32(total_weight);
        let avg_confidence = confidence_sum / valid_prices.len() as u32;

        Ok(AggregatedPrice {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            weighted_price,
            decimals: 7, // Standard Stellar decimals
            sources_used: valid_prices.len() as u32,
            total_sources,
            confidence_score: avg_confidence,
            timestamp: env.ledger().timestamp(),
        })
    }

    /// Validate oracle configuration
    pub fn validate_config(config: &OracleConfig) -> Result<(), Error> {
        if config.max_age_seconds == 0 {
            return Err(Error::InvalidOracleConfiguration);
        }

        if config.min_confidence > 100 {
            return Err(Error::InvalidOracleConfiguration);
        }

        Ok(())
    }

    /// Check if oracle response is valid
    pub fn validate_response(
        env: &Env,
        response: &OracleResponse,
        request: &PriceFeedRequest,
    ) -> Result<(), Error> {
        // Check if response matches request
        if response.price_data.base_asset != request.base_asset
            || response.price_data.quote_asset != request.quote_asset
        {
            return Err(Error::OracleResponseMismatch);
        }

        // Check if price is not stale
        let current_time = env.ledger().timestamp();
        if current_time - response.price_data.timestamp > request.max_age_seconds {
            return Err(Error::StaleOracleData);
        }

        // Check confidence is reasonable
        if response.price_data.confidence > 100 {
            return Err(Error::InvalidOracleData);
        }

        Ok(())
    }

    /// Convert price between different decimal precisions
    pub fn normalize_price(
        price: U256,
        from_decimals: u32,
        to_decimals: u32,
    ) -> Result<U256, Error> {
        if from_decimals == to_decimals {
            return Ok(price);
        }

        if from_decimals > to_decimals {
            let diff = from_decimals - to_decimals;
            Ok(price / U256::from_u32(10u32.pow(diff)))
        } else {
            let diff = to_decimals - from_decimals;
            Ok(price * U256::from_u32(10u32.pow(diff)))
        }
    }

    /// Get historical price data (if available)
    pub fn get_historical_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
        timestamp: u64,
    ) -> Result<PriceData, Error> {
        // This would implement historical price queries
        // For now, return current price as fallback
        Self::get_price(env, oracle_config, request)
    }
}
