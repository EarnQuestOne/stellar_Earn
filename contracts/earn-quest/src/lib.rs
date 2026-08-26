#mod init;
mod reputation;
mod storage;

use soroban_sdk{contract, contractimpl, Address, Env, String, Vec};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        version: u32,
        config_params: Vec<(String, String>),
    ) {
        init::initialize(
            &env,
            init::InitConfig {
                admin,
                version,
                config_params,
            },
        );
    }

    pub fn upgrade(env: Env, caller: Address) -> bool {
        init::upgrade_authorize(&env, &caller)
    }

    pub fn version(env: Env) -> u32 {
        init::get_version(&env)
    }
}
