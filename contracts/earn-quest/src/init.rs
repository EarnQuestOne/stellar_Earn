use crate::reputation;
use crate::storage;
use soroban_sdk::{Address, Env, String, Vec};

#[allow(dead_code)]
pub struct InitConfig {
    pub admin: Address,
    pub version: u32,
    pub config_params: Vec<(String, String)>,
}

#[allow(dead_code)]
pub fn initialize(env: &Env, config: InitConfig) {
    if storage::is_initialized(env) {
        panic!("Contract already initialized");
    }
    storage::set_contract_admin(env, &config.admin);
    storage::set_admin(env, &config.admin);
    storage::set_version(env, config.version);
    storage::set_config(env, &config.config_params);
    let _ = reputation::seed_default_badge_types(env, &config.admin);
    storage::mark_initialized(env);
}

pub fn upgrade_authorize(env: &Env, caller: &Address) -> bool {
    let admin = storage::get_admin(env);
    caller == &admin
}
