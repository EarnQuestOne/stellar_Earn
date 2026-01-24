use soroban_sdk::{contract, contractimpl, Address, Env, Map, Symbol, symbol_short};

const ADMIN_REGISTRY: &str = "admin_registry";
const INITIAL_ADMIN: &str = "initial_admin";

/// Admin Role Management System for Stellar contracts
/// Supports multi-admin governance with role-based access control
#[contract]
pub struct AdminRoleManager;

#[contractimpl]
impl AdminRoleManager {
    /// Initialize the contract with an initial admin
    /// Called once during contract deployment
    pub fn initialize(env: Env, initial_admin: Address) -> Result<(), Symbol> {
        // Check if already initialized
        if env.storage().persistent().has(&Symbol::new(&env, ADMIN_REGISTRY)) {
            return Err(symbol_short!("already_init"));
        }

        // Create admin registry
        let mut admins: Map<Address, bool> = Map::new(&env);
        admins.set(initial_admin, true);

        // Store admin registry
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, ADMIN_REGISTRY), &admins);

        // Mark as initialized
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, INITIAL_ADMIN), &true);

        Ok(())
    }

    /// Add a new admin to the registry
    /// Only existing admins can call this function
    pub fn add_admin(env: Env, invoker: Address, new_admin: Address) -> Result<(), Symbol> {
        invoker.require_auth();

        // Check if invoker is an admin
        if !Self::is_admin(&env, &invoker) {
            return Err(symbol_short!("unauthorized"));
        }

        // Prevent adding zero address
        if new_admin.to_string().is_empty() {
            return Err(symbol_short!("invalid_addr"));
        }

        // Get current admin registry
        let mut admins = Self::get_admin_registry(&env)?;

        // Check if already an admin
        if admins.contains(&new_admin) {
            return Err(symbol_short!("already_admin"));
        }

        // Add new admin
        admins.set(new_admin, true);

        // Save updated registry
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, ADMIN_REGISTRY), &admins);

        Ok(())
    }

    /// Remove an admin from the registry
    /// Only existing admins can call this function
    /// Cannot remove the last admin
    pub fn remove_admin(env: Env, invoker: Address, admin_to_remove: Address) -> Result<(), Symbol> {
        invoker.require_auth();

        // Check if invoker is an admin
        if !Self::is_admin(&env, &invoker) {
            return Err(symbol_short!("unauthorized"));
        }

        // Get current admin registry
        let mut admins = Self::get_admin_registry(&env)?;

        // Check if target is actually an admin
        if !admins.contains(&admin_to_remove) {
            return Err(symbol_short!("not_admin"));
        }

        // Prevent removing the last admin
        if admins.len() <= 1 {
            return Err(symbol_short!("last_admin"));
        }

        // Remove admin
        admins.remove(admin_to_remove);

        // Save updated registry
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, ADMIN_REGISTRY), &admins);

        Ok(())
    }

    /// Check if an address is an admin
    /// Helper function for authorization checks
    pub fn is_admin(env: &Env, address: &Address) -> bool {
        if let Ok(admins) = Self::get_admin_registry(env) {
            admins.contains(address)
        } else {
            false
        }
    }

    /// Get the current list of all admins
    pub fn get_admins(env: Env) -> Result<Vec<Address>, Symbol> {
        let admins = Self::get_admin_registry(&env)?;
        let mut admin_list: Vec<Address> = Vec::new(&env);

        for admin in admins.keys() {
            admin_list.push_back(admin);
        }

        Ok(admin_list)
    }

    /// Get the total number of admins
    pub fn admin_count(env: Env) -> Result<u32, Symbol> {
        let admins = Self::get_admin_registry(&env)?;
        Ok(admins.len())
    }

    // ============ Internal Helper Functions ============

    /// Internal function to retrieve admin registry from storage
    fn get_admin_registry(env: &Env) -> Result<Map<Address, bool>, Symbol> {
        env.storage()
            .persistent()
            .get(&Symbol::new(env, ADMIN_REGISTRY))
            .ok_or_else(|| symbol_short!("no_registry"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Env as _};

    fn create_test_env() -> (Env, Address) {
        let env = Env::default();
        let admin = Address::random(&env);
        (env, admin)
    }

    #[test]
    fn test_initialize_contract() {
        let (env, admin) = create_test_env();
        let result = AdminRoleManager::initialize(env.clone(), admin.clone());
        assert!(result.is_ok());

        // Verify initial admin is set
        assert!(AdminRoleManager::is_admin(&env, &admin));
    }

    #[test]
    fn test_cannot_double_initialize() {
        let (env, admin) = create_test_env();
        AdminRoleManager::initialize(env.clone(), admin.clone()).unwrap();

        let result = AdminRoleManager::initialize(env, admin);
        assert_eq!(result.err(), Some(symbol_short!("already_init")));
    }

    #[test]
    fn test_add_admin_success() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        let result = AdminRoleManager::add_admin(env.clone(), admin1, admin2.clone());

        assert!(result.is_ok());
        assert!(AdminRoleManager::is_admin(&env, &admin2));
    }

    #[test]
    fn test_add_admin_unauthorized() {
        let (env, admin1) = create_test_env();
        let unauthorized = Address::random(&env);
        let admin2 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1).unwrap();
        let result = AdminRoleManager::add_admin(env, unauthorized, admin2);

        assert_eq!(result.err(), Some(symbol_short!("unauthorized")));
    }

    #[test]
    fn test_add_duplicate_admin() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1.clone(), admin2.clone()).unwrap();

        let result = AdminRoleManager::add_admin(env, admin1, admin2);
        assert_eq!(result.err(), Some(symbol_short!("already_admin")));
    }

    #[test]
    fn test_remove_admin_success() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1.clone(), admin2.clone()).unwrap();

        let result = AdminRoleManager::remove_admin(env.clone(), admin1, admin2.clone());
        assert!(result.is_ok());
        assert!(!AdminRoleManager::is_admin(&env, &admin2));
    }

    #[test]
    fn test_cannot_remove_last_admin() {
        let (env, admin1) = create_test_env();

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        let result = AdminRoleManager::remove_admin(env, admin1.clone(), admin1);

        assert_eq!(result.err(), Some(symbol_short!("last_admin")));
    }

    #[test]
    fn test_remove_admin_unauthorized() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);
        let unauthorized = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1, admin2.clone()).unwrap();

        let result = AdminRoleManager::remove_admin(env, unauthorized, admin2);
        assert_eq!(result.err(), Some(symbol_short!("unauthorized")));
    }

    #[test]
    fn test_get_admins() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);
        let admin3 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1.clone(), admin2.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1, admin3).unwrap();

        let admins = AdminRoleManager::get_admins(env).unwrap();
        assert_eq!(admins.len(), 3);
    }

    #[test]
    fn test_admin_count() {
        let (env, admin1) = create_test_env();
        let admin2 = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();
        AdminRoleManager::add_admin(env.clone(), admin1, admin2).unwrap();

        let count = AdminRoleManager::admin_count(env).unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_is_admin_check() {
        let (env, admin1) = create_test_env();
        let non_admin = Address::random(&env);

        AdminRoleManager::initialize(env.clone(), admin1.clone()).unwrap();

        assert!(AdminRoleManager::is_admin(&env, &admin1));
        assert!(!AdminRoleManager::is_admin(&env, &non_admin));
    }
}
