#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct StellarEarn;

#[contractimpl]
impl StellarEarn {
    /// Initialize the contract
    pub fn init(_env: Env) {
        // Contract initialization logic
    }

    /// Example hello function
    pub fn hello(_env: Env, name: Symbol) -> Symbol {
        name
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{symbol_short, Env};

    #[test]
    fn test_hello() {
        let env = Env::default();
        let name = symbol_short!("Alice");
        let result = StellarEarn::hello(env.clone(), name.clone());
        assert_eq!(result, name);
    }
}
