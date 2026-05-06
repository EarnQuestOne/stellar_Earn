#![cfg(test)]

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};
use crate::{EarnQuestContract, EarnQuestContractClient};

fn setup(env: &Env) -> (EarnQuestContractClient<'_>, Address) {
    env.mock_all_auths();
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_token_metadata() {
    let env = Env::default();
    let (client, _) = setup(&env);

    assert_eq!(client.name(), String::from_str(&env, "EarnQuest Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "EQT"));
    assert_eq!(client.decimals(), 7);
}

#[test]
fn test_mint_and_balance() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let user = Address::generate(&env);

    client.mint(&admin, &user, &1000);
    assert_eq!(client.balance(&user), 1000);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.mint(&admin, &user1, &1000);
    client.transfer(&user1, &user2, &400);

    assert_eq!(client.balance(&user1), 600);
    assert_eq!(client.balance(&user2), 400);
}

#[test]
fn test_allowance_and_transfer_from() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let to = Address::generate(&env);

    client.mint(&admin, &owner, &1000);
    client.approve(&owner, &spender, &500, &200);

    assert_eq!(client.allowance(&owner, &spender), 500);

    client.transfer_from(&spender, &owner, &to, &300);

    assert_eq!(client.balance(&owner), 700);
    assert_eq!(client.balance(&to), 300);
    assert_eq!(client.allowance(&owner, &spender), 200);
}

#[test]
fn test_burn() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let user = Address::generate(&env);

    client.mint(&admin, &user, &1000);
    client.burn(&user, &300);

    assert_eq!(client.balance(&user), 700);
}

#[test]
fn test_set_metadata() {
    let env = Env::default();
    let (client, admin) = setup(&env);

    client.set_token_metadata(&admin, &String::from_str(&env, "New Name"), &String::from_str(&env, "NEW"), &9);

    assert_eq!(client.name(), String::from_str(&env, "New Name"));
    assert_eq!(client.symbol(), String::from_str(&env, "NEW"));
    assert_eq!(client.decimals(), 9);
}
