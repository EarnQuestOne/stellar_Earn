#![cfg(test)]

use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};
use soroban_sdk::{symbol_short, Address, Env};

use earn_quest::{EarnQuestContractClient, Dispute, DisputeStatus};

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
    let cid = env.register_contract(None, earn_quest::EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_arbitrator_rotation_timelock_and_authority() {
    let env = make_env();
    set_time(&env, 1_000);
    let (client, admin) = setup(&env);

    // Set initial arbitrator A0
    let a0 = Address::generate(&env);
    client.schedule_arbitrator_change(&admin, &a0).unwrap();
    // Before timelock finalize should fail
    let res = client.try_finalize_arbitrator_change(&admin);
    assert!(res.is_err());

    // Advance time past timelock and finalize
    set_time(&env, 1_000 + 86400 + 10);
    client.finalize_arbitrator_change(&admin).unwrap();

    // Verify current arbitrator
    let cur = client.get_arbitrator();
    assert_eq!(cur, Some(a0.clone()));

    // Register a quest so resolve_dispute can fetch quest data safely
    let quest_id = symbol_short!("Q1");
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);
    client.register_quest(&quest_id, &admin, &token, &1000, &verifier, &1_000_000).unwrap();

    // Open dispute (initiator)
    let initiator = Address::generate(&env);
    let d: Dispute = client.open_dispute(&quest_id, &initiator, &a0).unwrap();
    assert_eq!(d.status, DisputeStatus::Pending);

    // Schedule rotation to A1
    let a1 = Address::generate(&env);
    client.schedule_arbitrator_change(&admin, &a1).unwrap();
    // advance and finalize
    set_time(&env, env.ledger().timestamp() as u64 + 86400 + 5);
    client.finalize_arbitrator_change(&admin).unwrap();

    // Old arbitrator A0 should no longer be authorized to resolve
    let res_old = client.try_resolve_dispute(&quest_id, &initiator, &a0, true, 0);
    assert!(res_old.is_err(), "old arbitrator must not be able to resolve after rotation");

    // New arbitrator can resolve
    client.resolve_dispute(&quest_id, &initiator, &a1, true, 0).unwrap();
}
