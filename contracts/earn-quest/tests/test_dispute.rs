#![cfg(test)]

extern crate earn_quest;

use earn_quest::{DisputeStatus, EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events},
    Address, Env, IntoVal, Symbol,
};

fn setup() -> (Env, EarnQuestContractClient<'static>, Address, Address, Address) {
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

    client.resolve_dispute(&quest_id, &initiator, &arbitrator);

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