#![cfg(test)]

use crate::types::RewardAllocation;
use crate::{EarnQuestContract, EarnQuestContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{contract, contractimpl, symbol_short, Address, BytesN, Env, Vec};

#[contract]
struct MockTokenContract;

#[contractimpl]
impl MockTokenContract {
    pub fn __constructor(_env: Env, _admin: Address) {}

    pub fn mint(env: Env, to: Address, amount: i128) {
        let balance = env.storage().instance().get(&to).unwrap_or(0);
        env.storage().instance().set(&to, &(balance + amount));
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().instance().get(&id).unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = env.storage().instance().get(&from).unwrap_or(0);
        assert!(from_balance >= amount, "insufficient balance");
        env.storage().instance().set(&from, &(from_balance - amount));
        let to_balance = env.storage().instance().get(&to).unwrap_or(0);
        env.storage().instance().set(&to, &(to_balance + amount));
    }
}

fn setup(env: &Env) -> (EarnQuestContractClient<'_>, Address) {
    env.mock_all_auths();
    let cid = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &cid);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

#[test]
fn test_multi_token_quest_tracks_escrow_and_payouts_per_token() {
    let env = Env::default();
    let (client, _) = setup(&env);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("q_multi");
    let deadline = env.ledger().timestamp() + 86_400;

    let token_a_id = env.register_contract(None, MockTokenContract);
    let token_b_id = env.register_contract(None, MockTokenContract);
    let token_a = MockTokenContractClient::new(&env, &token_a_id);
    let token_b = MockTokenContractClient::new(&env, &token_b_id);

    token_a.mint(&creator, &1_000);
    token_b.mint(&creator, &1_000);

    let allocations = Vec::from_array(
        &env,
        [
            RewardAllocation {
                asset: token_a_id.clone(),
                percentage: 50,
            },
            RewardAllocation {
                asset: token_b_id.clone(),
                percentage: 50,
            },
        ],
    );

    client.register_quest_with_rewards(
        &quest_id,
        &creator,
        &100,
        &allocations,
        &verifier,
        &deadline,
    );

    client.deposit_escrow(&quest_id, &creator, &token_a_id, &100);
    client.deposit_escrow(&quest_id, &creator, &token_b_id, &100);

    let escrow = client.get_escrow_info(&quest_id);
    assert_eq!(escrow.tokens.len(), 2);
    assert_eq!(escrow.token_balances.len(), 2);

    let proof: BytesN<32> = BytesN::from_array(&env, &[7u8; 32]);
    client.submit_proof(&quest_id, &submitter, &proof);
    client.approve_submission(&quest_id, &submitter, &verifier);
    client.claim_reward(&quest_id, &submitter, &100);

    assert_eq!(token_a.balance(&submitter), 50);
    assert_eq!(token_b.balance(&submitter), 50);
}
