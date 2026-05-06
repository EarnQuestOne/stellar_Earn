#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, Address, Bytes, BytesN, Env, xdr::ToXdr};

// Import from the library
extern crate earn_quest;
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

#[test]
fn test_commit_reveal_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    // Setup
    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q1");
    let asset = Address::generate(&env);

    client.register_quest(&quest_id, &creator, &asset, &100, &verifier, &10000);

    // 1. Prepare commitment
    // In a real scenario, user does this off-chain
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);
    
    let mut data = Bytes::new(&env);
    data.append(&proof_hash.clone().into());
    data.append(&salt.clone().into());
    data.append(&submitter.clone().to_xdr(&env));
    let commitment_hash: BytesN<32> = env.crypto().sha256(&data).into();

    // 2. Commit
    client.commit_submission(&quest_id, &submitter, &commitment_hash.into());

    // 3. Reveal
    client.reveal_submission(&quest_id, &submitter, &proof_hash, &salt);

    // 4. Verify submission exists and is in Pending status
    let submission = client.get_submission(&quest_id, &submitter);
    assert_eq!(submission.proof_hash, proof_hash);
    
    // 5. Verify commitment is deleted (reveal again should fail)
    let res = client.try_reveal_submission(&quest_id, &submitter, &proof_hash, &salt);
    assert!(res.is_err(), "Commitment should be deleted after reveal");
}

#[test]
fn test_reveal_with_invalid_salt_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q2");
    let asset = Address::generate(&env);

    client.register_quest(&quest_id, &creator, &asset, &100, &verifier, &10000);

    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);
    let wrong_salt = BytesN::from_array(&env, &[3u8; 32]);
    
    let mut data = Bytes::new(&env);
    data.append(&proof_hash.clone().into());
    data.append(&salt.clone().into());
    data.append(&submitter.clone().to_xdr(&env));
    let commitment_hash: BytesN<32> = env.crypto().sha256(&data).into();

    client.commit_submission(&quest_id, &submitter, &commitment_hash.into());

    // Reveal with wrong salt should fail
    let res = client.try_reveal_submission(&quest_id, &submitter, &proof_hash, &wrong_salt);
    assert!(res.is_err(), "Reveal with wrong salt must fail");
}

#[test]
fn test_front_running_prevention() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let attacker = Address::generate(&env);
    let quest_id = symbol_short!("Q3");
    let asset = Address::generate(&env);

    client.register_quest(&quest_id, &creator, &asset, &100, &verifier, &10000);

    // Submitter commits
    let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);
    
    let mut data = Bytes::new(&env);
    data.append(&proof_hash.clone().into());
    data.append(&salt.clone().into());
    data.append(&submitter.clone().to_xdr(&env));
    let commitment_hash: BytesN<32> = env.crypto().sha256(&data).into();

    client.commit_submission(&quest_id, &submitter, &commitment_hash.into());

    // Attacker tries to reveal the same proof_hash and salt for themselves
    // but they haven't committed anything.
    let res = client.try_reveal_submission(&quest_id, &attacker, &proof_hash, &salt);
    assert!(res.is_err(), "Attacker cannot reveal without a commitment");

    // Even if attacker tries to use the same proof_hash and salt, they would need 
    // to have committed hash(proof_hash, salt, attacker) earlier.
    // If they try to reveal with the SUBMITTER's address (impersonation), require_auth will stop them.
    // If they use their own address, the hash won't match the commitment if they managed to steal it,
    // or they simply won't have a commitment record.
}

#[test]
fn test_double_commitment_prevention() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let verifier = Address::generate(&env);
    let submitter = Address::generate(&env);
    let quest_id = symbol_short!("Q4");
    let asset = Address::generate(&env);

    client.register_quest(&quest_id, &creator, &asset, &100, &verifier, &10000);

    let hash1 = BytesN::from_array(&env, &[1u8; 32]);
    let hash2 = BytesN::from_array(&env, &[2u8; 32]);

    client.commit_submission(&quest_id, &submitter, &hash1);
    
    // Second commit should fail
    let res = client.try_commit_submission(&quest_id, &submitter, &hash2);
    assert!(res.is_err(), "Should not allow double commitment");
}
