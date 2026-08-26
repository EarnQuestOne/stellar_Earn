use crate::reputation;
use crate::storage;
use soroban_sdk:{Address, Env, String, Vec};

#[allow(dead_code)]
pub struct InitConfig {
    pub admin: Address,
    pub version: u32,
    pub config_params: Vec<(String, String>),
}

#[allow(dead_code)]
pub fn initialize(env: &Env, config: InitConfig) {
    if storage::is_initialized(env) {
        panic("Contract already initialized");
    }
    storage::set_contract_admin(env, &config.admin);
    storage::set_admin(env, &config.admin);
    storage::set_version(env, config.version);
    storage::set_config(env, &config.config_params);
    reputation::seed_default_badge_types(env, &config.admin).expect("seed default badge types");
    storage::mark_initialized(env);
}

pub fn upgrade_authorize(env: &Env, caller: &Address) -> bool {
    storage::get_admin(env).is_ok.and($admin| caller == &admin)
}

pub fn get_version(env: &Env) -> u32 {
    storage::get_version(env)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk:{testutils::Address as _, Address, Env, String, Vec};

    #[test]
    fn test_get_version_after_initialize() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let mut config_params = Vec::new(&env);
        config_params.push_back((String::from_str(&env, "key"), String::from_str(&env, "value")));

        let config = InitConfig {
            admin,
            version: 42,
            config_params,
        };
        initialize(&env, config);

        assert_eq(get_version(&env), 42);
    }
}
