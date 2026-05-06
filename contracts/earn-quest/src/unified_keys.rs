use soroban_sdk::contracttype;

/// Unified storage key definitions for the earn-quest contract.
/// All on-chain data keys are declared here to avoid collisions and
/// provide a single source of truth for storage layout.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The contract administrator address.
    Admin,
    /// Native token balance for a given user address.
    Balance(soroban_sdk::Address),
    /// Metadata / reward data for a quest identified by its numeric ID.
    QuestData(u64),
    /// A specific user's progress on a specific quest.
    UserProgress(soroban_sdk::Address, u64),
    /// General contract configuration blob.
    Config,
}
