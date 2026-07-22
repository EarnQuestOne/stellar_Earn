#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{symbol_short, Address, Env, Vec};

use earn_quest::{EarnQuestContract, EarnQuestContractClient, Badge};

fn make_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn set_time(env: &Env, ts: u64) {
    env.ledger().set(LedgerInfo {
        protocol_version: 20,
        sequence_number: 1,
        timestamp: ts,
        network_id: Default::default(),
        base_reserve: 10,
        min_temp_entry_ttl: 100,
        min_persistent_entry_ttl: 100,
        max_entry_ttl: 1_000_000,
    });
}

fn setup(env: &Env) -> (EarnQuestContractClient, Address) {
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_superadmin_can_update_level_thresholds_and_recalc() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, admin) = setup(&env);

    // New thresholds: level2=50, level3=100, level4=200, level5=400
    let mut thresholds: Vec<u64> = Vec::new(&env);
    thresholds.push_back(50u64);
    thresholds.push_back(100u64);
    thresholds.push_back(200u64);
    thresholds.push_back(400u64);

    // SuperAdmin updates thresholds
    client.set_level_thresholds(&admin, thresholds);

    // New user
    let user = Address::generate(&env);
    let stats_before = client.get_user_stats(&user);
    assert_eq!(stats_before.level, 1);

    // Grant a Legend badge (100 XP) - should push user to level 3 under new thresholds
    client.grant_badge(&admin, &user, Badge::Legend).unwrap();

    let stats_after = client.get_user_stats(&user);
    assert_eq!(stats_after.xp, 100);
    assert_eq!(stats_after.level, 3);
}

#[test]
fn test_non_superadmin_cannot_update_thresholds() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, _admin) = setup(&env);

    let random = Address::generate(&env);
    let mut thresholds: Vec<u64> = Vec::new(&env);
    thresholds.push_back(10u64);
    thresholds.push_back(20u64);

    let res = client.try_set_level_thresholds(&random, thresholds);
    assert!(res.is_err(), "non-superadmin must be rejected");
}
