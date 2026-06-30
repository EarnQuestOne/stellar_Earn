use crate::errors::Error;
use crate::storage;
use crate::types::{
    AggregatedPrice, OracleConfig, OracleResponse, OracleType, PriceData, PriceFeedRequest,
    PushedPrice,
};
use crate::validation;
use soroban_sdk::{Address, Env, Vec, U256};

#[allow(dead_code)]
#[soroban_sdk::contractclient(name = "OracleClient")]
pub trait OracleInterface {
    fn lastprice(env: Env, base: Address, quote: Address) -> Option<PriceData>;
    fn price(env: Env, base: Address, quote: Address) -> Option<PriceData>;
}

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

        let price_data = match oracle_config.oracle_type {
            OracleType::StellarAsset => Self::get_stellar_asset_price(env, oracle_config, request)?,
            OracleType::StellarOracle => {
                Self::get_stellar_oracle_price(env, oracle_config, request)?
            }
            OracleType::Custom => Self::get_custom_oracle_price(env, oracle_config, request)?,
        };

        // Validate base and quote asset
        if price_data.base_asset != request.base_asset
            || price_data.quote_asset != request.quote_asset
        {
            return Err(Error::OracleRespMismatch);
        }

        // Validate timestamp / age
        let current_time = env.ledger().timestamp();
        if price_data.timestamp > current_time {
            return Err(Error::InvalidOracleData);
        }
        let age = current_time - price_data.timestamp;
        if age > oracle_config.max_age_seconds || age > request.max_age_seconds {
            return Err(Error::StaleOracleData);
        }

        // Validate confidence
        if price_data.confidence > 100 {
            return Err(Error::InvalidOracleData);
        }
        if price_data.confidence < oracle_config.min_confidence {
            return Err(Error::LowOracleConfidence);
        }

        Ok(price_data)
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

            if let Ok(price_data) = Self::get_price(env, &config, request) {
                valid_prices.push_back((price_data, config.min_confidence));
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
        _oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        // Implementation for Stellar Asset oracle
        // This would interface with Stellar's built-in asset pricing

        // For now, return a mock implementation
        let current_time = env.ledger().timestamp();
        Ok(PriceData {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            price: U256::from_u32(env, 1000), // Mock price
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
        Self::query_external_oracle(env, &oracle_config.oracle_address, request)
    }

    /// Get price from custom oracle implementation
    fn get_custom_oracle_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        Self::query_external_oracle(env, &oracle_config.oracle_address, request)
    }

    /// Query price from external oracle contract
    fn query_external_oracle(
        env: &Env,
        oracle_address: &Address,
        request: &PriceFeedRequest,
    ) -> Result<PriceData, Error> {
        let client = OracleClient::new(env, oracle_address);

        // Try calling lastprice first
        if let Ok(Ok(Some(price_data))) =
            client.try_lastprice(&request.base_asset, &request.quote_asset)
        {
            return Ok(price_data);
        }

        // Fallback to price
        if let Ok(Ok(Some(price_data))) =
            client.try_price(&request.base_asset, &request.quote_asset)
        {
            return Ok(price_data);
        }

        Err(Error::NoValidOracleData)
    }

    /// Calculate weighted average of multiple price sources
    fn calculate_weighted_average(
        env: &Env,
        valid_prices: &Vec<(PriceData, u32)>,
        total_sources: u32,
        request: &PriceFeedRequest,
    ) -> Result<AggregatedPrice, Error> {
        let mut weighted_sum = U256::from_u32(env, 0);
        let mut total_weight = 0u32;
        let mut confidence_sum = 0u32;

        for i in 0u32..valid_prices.len() {
            let (price_data, weight) = valid_prices.get(i).unwrap();
            let w = U256::from_u32(env, weight);
            let weighted_price = price_data.price.mul(&w);
            weighted_sum = weighted_sum.add(&weighted_price);
            total_weight += weight;
            confidence_sum += price_data.confidence;
        }

        if total_weight == 0 {
            return Err(Error::InvalidOracleConfig);
        }

        let weighted_price = weighted_sum.div(&U256::from_u32(env, total_weight));
        let avg_confidence = confidence_sum / valid_prices.len();

        Ok(AggregatedPrice {
            base_asset: request.base_asset.clone(),
            quote_asset: request.quote_asset.clone(),
            weighted_price,
            decimals: 7, // Standard Stellar decimals
            sources_used: valid_prices.len(),
            total_sources,
            confidence_score: avg_confidence,
            timestamp: env.ledger().timestamp(),
        })
    }

    /// Validate oracle configuration
    pub fn validate_config(config: &OracleConfig) -> Result<(), Error> {
        if config.max_age_seconds == 0 {
            return Err(Error::InvalidOracleConfig);
        }

        if config.min_confidence > 100 {
            return Err(Error::InvalidOracleConfig);
        }

        Ok(())
    }

    /// Check if oracle response is valid
    #[allow(dead_code)]
    pub fn validate_response(
        env: &Env,
        response: &OracleResponse,
        request: &PriceFeedRequest,
    ) -> Result<(), Error> {
        // Check if response matches request
        if response.price_data.base_asset != request.base_asset
            || response.price_data.quote_asset != request.quote_asset
        {
            return Err(Error::OracleRespMismatch);
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
    #[allow(dead_code)]
    pub fn normalize_price(
        env: &Env,
        price: U256,
        from_decimals: u32,
        to_decimals: u32,
    ) -> Result<U256, Error> {
        if from_decimals == to_decimals {
            return Ok(price);
        }

        if from_decimals > to_decimals {
            let diff = from_decimals - to_decimals;
            Ok(price.div(&U256::from_u32(env, 10u32.pow(diff))))
        } else {
            let diff = to_decimals - from_decimals;
            Ok(price.mul(&U256::from_u32(env, 10u32.pow(diff))))
        }
    }

    /// Get historical price data (if available)
    #[allow(dead_code)]
    pub fn get_historical_price(
        env: &Env,
        oracle_config: &OracleConfig,
        request: &PriceFeedRequest,
        _timestamp: u64,
    ) -> Result<PriceData, Error> {
        // This would implement historical price queries
        // For now, return current price as fallback
        Self::get_price(env, oracle_config, request)
    }

    /// Pushes a price for `token` from the OracleAdmin's own upstream feed
    /// into the contract's instance storage (addresses GH #1710).
    ///
    /// The pushed price lives at `DataKey::PushedPrice(token)` and is what
    /// the circuit-breaker (`validate_price_feed_fresh`) reads when the
    /// price-feed TTL is active.
    ///
    /// Returns:
    /// * `Err(Error::Paused)` if the contract is paused.
    /// * `Err(Error::OracleRespMismatch)` if `token` != `price_data.base_asset`.
    /// * `Err(Error::InvalidOracleData)` if any bounds check fails.
    /// * `Ok(())` on successful push.
    pub fn set_price(
        env: &Env,
        token: &Address,
        price_data: &PriceData,
    ) -> Result<(), Error> {
        if storage::is_paused(env) {
            return Err(Error::Paused);
        }

        if price_data.base_asset != *token {
            return Err(Error::OracleRespMismatch);
        }

        validation::validate_price_data_bounds(env, price_data)?;

        let pushed = PushedPrice {
            price: price_data.clone(),
            pushed_at: env.ledger().timestamp(),
        };
        storage::set_pushed_price(env, token, &pushed);
        Ok(())
    }

    /// Sets the price-feed staleness TTL in seconds. TTL = 0 disables the
    /// circuit-breaker. See `validation::validate_price_feed_fresh`.
    pub fn set_price_ttl(env: &Env, ttl_seconds: u64) {
        storage::set_price_feed_ttl(env, ttl_seconds);
    }

    /// Returns the currently configured price-feed staleness TTL in seconds.
    pub fn get_price_ttl(env: &Env) -> u64 {
        storage::get_price_feed_ttl(env)
    }
}
