#![cfg(test)]

extern crate earn_quest;

use earn_quest::{DisputeStatus, EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    Address, Env, IntoVal, Symbol,
};

fn setup() -> (
    Env,
    EarnQuestContractClient<'static>,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let initiator = Address::generate(&env);
    let arbitrator = Address::generate(&env);

    client.initialize(&admin);

    (env, client, admin, initiator, arbitrator)
}

#[test]
fn test_open_and_resolve_dispute_emit_indexed_events() {
    let (env, client, _, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp01");

    let dispute = client.open_dispute(&quest_id, &initiator, &arbitrator);
    assert_eq!(dispute.status, DisputeStatus::Pending);

    let (_, open_topics, _) = env.events().all().last().unwrap();
    let open_name: Symbol = open_topics.get(0).unwrap().into_val(&env);
    let open_quest: Symbol = open_topics.get(1).unwrap().into_val(&env);
    let open_initiator: Address = open_topics.get(2).unwrap().into_val(&env);
    let open_arbitrator: Address = open_topics.get(3).unwrap().into_val(&env);

    assert_eq!(open_name, symbol_short!("disp_open"));
    assert_eq!(open_quest, quest_id);
    assert_eq!(open_initiator, initiator);
    assert_eq!(open_arbitrator, arbitrator);

    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);

    let resolved = client.get_dispute(&quest_id, &initiator);
    assert_eq!(resolved.status, DisputeStatus::Resolved);

    let (_, resolved_topics, _) = env.events().all().last().unwrap();
    let resolved_name: Symbol = resolved_topics.get(0).unwrap().into_val(&env);
    let resolved_quest: Symbol = resolved_topics.get(1).unwrap().into_val(&env);
    let resolved_initiator: Address = resolved_topics.get(2).unwrap().into_val(&env);
    let resolved_arbitrator: Address = resolved_topics.get(3).unwrap().into_val(&env);

    assert_eq!(resolved_name, symbol_short!("disp_res"));
    assert_eq!(resolved_quest, quest_id);
    assert_eq!(resolved_initiator, initiator);
    assert_eq!(resolved_arbitrator, arbitrator);
}

/// Registers a quest on the contract so an upheld resolution (which looks
/// up the quest's verifier) can complete.
fn register_quest(env: &Env, client: &EarnQuestContractClient<'static>, quest_id: &Symbol) {
    let token_issuer = Address::generate(env);
    let token_obj = env.register_stellar_asset_contract_v2(token_issuer);
    let token_addr = token_obj.address();
    let verifier = Address::generate(env);
    let deadline = env.ledger().timestamp() + 86_400;
    client.register_quest(
        quest_id,
        &Address::generate(env),
        &token_addr,
        &100_i128,
        &verifier,
        &deadline,
    );
}

#[test]
fn test_resolve_dispute_emits_outcome_in_event_data() {
    let (env, client, _, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp04");
    register_quest(&env, &client, &quest_id);

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    // Resolve with the dispute upheld and a 50% stake slash requested.
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &true, &5_000_u32);

    let (_, resolved_topics, resolved_data) = env.events().all().last().unwrap();
    let resolved_name: Symbol = resolved_topics.get(0).unwrap().into_val(&env);
    assert_eq!(resolved_name, symbol_short!("disp_res"));

    // The outcome (upheld, slash_bps) must be published so indexers can
    // track the resolution without decoding storage.
    let (upheld, slash_bps): (bool, u32) = resolved_data.into_val(&env);
    assert!(upheld);
    assert_eq!(slash_bps, 5_000);
}

#[test]
fn test_resolve_dispute_not_upheld_emits_false_outcome() {
    let (env, client, _, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp05");

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);

    let (_, _, resolved_data) = env.events().all().last().unwrap();
    let (upheld, slash_bps): (bool, u32) = resolved_data.into_val(&env);
    assert!(!upheld);
    assert_eq!(slash_bps, 0);
}

#[test]
fn test_withdraw_dispute_emits_indexed_event() {
    let (env, client, _, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp02");

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.withdraw_dispute(&quest_id, &initiator);

    let withdrawn = client.get_dispute(&quest_id, &initiator);
    assert_eq!(withdrawn.status, DisputeStatus::Withdrawn);

    let (_, topics, _) = env.events().all().last().unwrap();
    let event_name: Symbol = topics.get(0).unwrap().into_val(&env);
    let event_quest: Symbol = topics.get(1).unwrap().into_val(&env);
    let event_initiator: Address = topics.get(2).unwrap().into_val(&env);

    assert_eq!(event_name, symbol_short!("disp_wd"));
    assert_eq!(event_quest, quest_id);
    assert_eq!(event_initiator, initiator);
}

#[test]
fn test_appeal_process_emits_indexed_events() {
    let (env, client, admin, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp03");
    let appeals_arbitrator = Address::generate(&env);

    // Open and resolve initial dispute
    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);

    // Appeal the resolution
    client.appeal_dispute(&quest_id, &initiator, &appeals_arbitrator);

    let appealed = client.get_dispute(&quest_id, &initiator);
    assert_eq!(appealed.status, DisputeStatus::Appealed);
    assert_eq!(appealed.arbitrator, appeals_arbitrator);

    let (_, appeal_topics, _) = env.events().all().last().unwrap();
    let appeal_name: Symbol = appeal_topics.get(0).unwrap().into_val(&env);
    let appeal_quest: Symbol = appeal_topics.get(1).unwrap().into_val(&env);
    let appeal_initiator: Address = appeal_topics.get(2).unwrap().into_val(&env);
    let appeal_arbitrator: Address = appeal_topics.get(3).unwrap().into_val(&env);

    assert_eq!(appeal_name, symbol_short!("disp_appl"));
    assert_eq!(appeal_quest, quest_id);
    assert_eq!(appeal_initiator, initiator);
    assert_eq!(appeal_arbitrator, appeals_arbitrator);

    // Resolve the appeal (only admin can resolve)
    // We use the admin account as the arbitrator for resolution
    client.resolve_dispute(&quest_id, &initiator, &admin, &false, &0_u32);

    let final_dispute = client.get_dispute(&quest_id, &initiator);
    assert_eq!(final_dispute.status, DisputeStatus::Resolved);

    let (_, resolve_topics, _) = env.events().all().last().unwrap();
    let resolve_name: Symbol = resolve_topics.get(0).unwrap().into_val(&env);
    assert_eq!(resolve_name, symbol_short!("disp_res"));
}

#[test]
fn test_reopen_appealed_dispute_rejected() {
    let (env, client, _admin, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp06");
    let appeals_arbitrator = Address::generate(&env);

    // Drive the dispute into the non-terminal `Appealed` state.
    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);
    client.appeal_dispute(&quest_id, &initiator, &appeals_arbitrator);

    // Re-opening a fresh dispute while an appeal is pending must be rejected.
    let result = client.try_open_dispute(&quest_id, &initiator, &arbitrator);
    assert!(
        result.is_err(),
        "re-opening a dispute while it is appealed must be rejected"
    );

    // The appealed dispute record must be untouched.
    let pending = client.get_dispute(&quest_id, &initiator);
    assert_eq!(pending.status, DisputeStatus::Appealed);
    assert_eq!(pending.arbitrator, appeals_arbitrator);
}

#[test]
fn test_resolve_already_resolved_dispute_rejected() {
    let (_env, client, _, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp07");

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);

    // A second resolution on the same dispute must be rejected.
    let result = client.try_resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);
    assert!(
        result.is_err(),
        "resolving an already-resolved dispute must be rejected"
    );
}

#[test]
fn test_appeal_already_appealed_dispute_rejected() {
    let (env, client, _admin, initiator, arbitrator) = setup();
    let quest_id = symbol_short!("disp08");
    let appeals_arbitrator = Address::generate(&env);

    client.open_dispute(&quest_id, &initiator, &arbitrator);
    client.resolve_dispute(&quest_id, &initiator, &arbitrator, &false, &0_u32);
    client.appeal_dispute(&quest_id, &initiator, &appeals_arbitrator);

    // A second appeal on the same dispute must be rejected.
    let result = client.try_appeal_dispute(&quest_id, &initiator, &arbitrator);
    assert!(
        result.is_err(),
        "appealing an already-appealed dispute must be rejected"
    );
}
