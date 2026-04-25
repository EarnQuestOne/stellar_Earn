#![cfg(test)]

use soroban_sdk::{symbol_short, testutils::Address as _, Address, BytesN, Env, String, Vec};

extern crate earn_quest;
use earn_quest::types::{MetadataDescription, QuestMetadata};
use earn_quest::{EarnQuestContract, EarnQuestContractClient};

fn setup_contract(env: &Env) -> (Address, EarnQuestContractClient<'_>) {
    let contract_id = env.register_contract(None, EarnQuestContract);
    let client = EarnQuestContractClient::new(env, &contract_id);
    (contract_id, client)
}

fn make_inline_metadata(
    env: &Env,
    title: &str,
    description: &str,
    category: &str,
    tags: &[&str],
    requirements: &[&str],
) -> QuestMetadata {
    let mut tags_vec = Vec::new(env);
    for tag in tags {
        tags_vec.push_back(String::from_str(env, tag));
    }

    let mut reqs_vec = Vec::new(env);
    for req in requirements {
        reqs_vec.push_back(String::from_str(env, req));
    }

    QuestMetadata {
        title: String::from_str(env, title),
        description: MetadataDescription::Inline(String::from_str(env, description)),
        requirements: reqs_vec,
        category: String::from_str(env, category),
        tags: tags_vec,
    }
}

#[test]
fn test_metadata_set_during_quest_creation_and_queryable() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let quest_id = symbol_short!("META1");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let metadata = make_inline_metadata(
        &env,
        "Build Wallet",
        "Implement wallet connect support.",
        "development",
        &["wallet", "frontend"],
        &["Connect wallet", "Display address"],
    );

    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );

    assert!(client.has_quest_metadata(&quest_id));
    let loaded = client.get_quest_metadata(&quest_id);
    assert_eq!(loaded, metadata);
}

#[test]
fn test_metadata_update_by_creator() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let quest_id = symbol_short!("META2");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let metadata = make_inline_metadata(
        &env,
        "Initial Title",
        "Initial description.",
        "build",
        &["initial"],
        &["Initial requirement"],
    );
    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );

    let updated = make_inline_metadata(
        &env,
        "Updated Title",
        "Updated description.",
        "engineering",
        &["updated", "v2"],
        &["Updated requirement"],
    );
    client.update_quest_metadata(&quest_id, &creator, &updated);

    let loaded = client.get_quest_metadata(&quest_id);
    assert_eq!(loaded, updated);
}

#[test]
fn test_metadata_update_rejects_unauthorized_user() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let quest_id = symbol_short!("META3");
    let creator = Address::generate(&env);
    let updater = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let metadata = make_inline_metadata(
        &env,
        "Base",
        "Base description.",
        "security",
        &["base"],
        &["Base req"],
    );
    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );

    let updated = make_inline_metadata(
        &env,
        "Should Fail",
        "Unauthorized update attempt.",
        "security",
        &["invalid"],
        &["No permission"],
    );
    let result = client.try_update_quest_metadata(&quest_id, &updater, &updated);
    assert!(result.is_err());
}

#[test]
fn test_metadata_update_allowed_for_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let admin = Address::generate(&env);
    client.initialize(&admin);

    let quest_id = symbol_short!("META4");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let metadata = make_inline_metadata(
        &env,
        "Start",
        "Start description.",
        "qa",
        &["qa"],
        &["Run tests"],
    );
    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );

    let admin_update = make_inline_metadata(
        &env,
        "Admin Revised",
        "Admin updated metadata.",
        "qa",
        &["admin"],
        &["Review report"],
    );
    client.update_quest_metadata(&quest_id, &admin, &admin_update);

    let loaded = client.get_quest_metadata(&quest_id);
    assert_eq!(loaded, admin_update);
}

#[test]
fn test_hash_reference_metadata_supported() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let quest_id = symbol_short!("META5");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let mut tags = Vec::new(&env);
    tags.push_back(String::from_str(&env, "ipfs"));
    let mut requirements = Vec::new(&env);
    requirements.push_back(String::from_str(&env, "Upload proof"));

    let hash = BytesN::from_array(&env, &[7u8; 32]);
    let metadata = QuestMetadata {
        title: String::from_str(&env, "Off-chain heavy details"),
        description: MetadataDescription::Hash(hash.clone()),
        requirements,
        category: String::from_str(&env, "content"),
        tags,
    };

    client.register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );

    let loaded = client.get_quest_metadata(&quest_id);
    assert_eq!(loaded.description, MetadataDescription::Hash(hash));
}

#[test]
fn test_large_inline_metadata_description_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let (_, client) = setup_contract(&env);
    let quest_id = symbol_short!("META6");
    let creator = Address::generate(&env);
    let token = Address::generate(&env);
    let verifier = Address::generate(&env);

    let large_desc = "a".repeat(1201);
    let metadata = make_inline_metadata(
        &env,
        "Too Large",
        &large_desc,
        "gas",
        &["limit"],
        &["reject large inline description"],
    );

    let result = client.try_register_quest_with_metadata(
        &quest_id, &creator, &token, &1000, &verifier, &10_000, &metadata,
    );
    assert!(result.is_err());
}
