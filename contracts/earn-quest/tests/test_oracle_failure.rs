#![cfg(test)]

extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn init_client(env: &Env) -> (EarnQuestContractClient, Address) {
    env.mock_all_auths();
    let id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

/// Requesting a price with no oracles configured must return an error.
#[test]
#[should_panic]
fn get_price_with_no_oracles_panics() {
    let env = Env::default();
    let (client, _) = init_client(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);
    client.get_price(&base, &quote, &300u64);
}

/// Requesting a price from a non-existent oracle address must return an error.
#[test]
#[should_panic]
fn get_price_from_unknown_oracle_panics() {
    let env = Env::default();
    let (client, _) = init_client(&env);
    let unknown_oracle = Address::generate(&env);
    let base = Address::generate(&env);
    let quote = Address::generate(&env);
    client.get_price_from_oracle(&unknown_oracle, &base, &quote, &300u64);
}