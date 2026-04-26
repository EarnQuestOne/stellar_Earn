#![cfg(test)]
use soroban_sdk::{symbol_short, Env};

use crate::StellarEarn;

#[test]
fn test_init() {
    let env = Env::default();
    StellarEarn::init(env);
}

#[test]
fn test_hello() {
    let env = Env::default();
    let name = symbol_short!("World");
    let result = StellarEarn::hello(env.clone(), name.clone());
    assert_eq!(result, name);
}
