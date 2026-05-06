use crate::storage::DataKey;
use soroban_sdk::{Address, Env, String};

pub fn read_balance(e: &Env, addr: Address) -> i128 {
    e.storage().instance().get(&DataKey::Balance(addr)).unwrap_or(0)
}

pub fn write_balance(e: &Env, addr: Address, amount: i128) {
    e.storage().instance().set(&DataKey::Balance(addr), &amount);
}

pub fn read_allowance(e: &Env, from: Address, spender: Address) -> i128 {
    e.storage().instance().get(&DataKey::Allowance(from, spender)).unwrap_or(0)
}

pub fn write_allowance(e: &Env, from: Address, spender: Address, amount: i128) {
    e.storage().instance().set(&DataKey::Allowance(from, spender), &amount);
}

pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
    read_allowance(&e, from, spender)
}

pub fn approve(e: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
    from.require_auth();
    write_allowance(&e, from, spender, amount);
}

pub fn balance(e: Env, id: Address) -> i128 {
    read_balance(&e, id)
}

pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
    from.require_auth();
    do_transfer(&e, from, to, amount);
}

pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
    spender.require_auth();
    let allowance = read_allowance(&e, from.clone(), spender.clone());
    if allowance < amount {
        panic!("insufficient allowance");
    }
    write_allowance(&e, from.clone(), spender, allowance - amount);
    do_transfer(&e, from, to, amount);
}

pub fn burn(e: Env, from: Address, amount: i128) {
    from.require_auth();
    let balance = read_balance(&e, from.clone());
    if balance < amount {
        panic!("insufficient balance");
    }
    write_balance(&e, from, balance - amount);
}

pub fn burn_from(e: Env, spender: Address, from: Address, amount: i128) {
    spender.require_auth();
    let allowance = read_allowance(&e, from.clone(), spender.clone());
    if allowance < amount {
        panic!("insufficient allowance");
    }
    write_allowance(&e, from.clone(), spender, allowance - amount);
    let balance = read_balance(&e, from.clone());
    if balance < amount {
        panic!("insufficient balance");
    }
    write_balance(&e, from, balance - amount);
}

pub fn decimals(e: Env) -> u32 {
    e.storage().instance().get(&DataKey::TokenDecimals).unwrap_or(7)
}

pub fn name(e: Env) -> String {
    e.storage().instance().get(&DataKey::TokenName).unwrap_or(String::from_str(&e, "EarnQuest Token"))
}

pub fn symbol(e: Env) -> String {
    e.storage().instance().get(&DataKey::TokenSymbol).unwrap_or(String::from_str(&e, "EQT"))
}

fn do_transfer(e: &Env, from: Address, to: Address, amount: i128) {
    let balance_from = read_balance(e, from.clone());
    if balance_from < amount {
        panic!("insufficient balance");
    }
    write_balance(e, from, balance_from - amount);
    let balance_to = read_balance(e, to.clone());
    write_balance(e, to, balance_to + amount);
}

pub fn mint(e: Env, to: Address, amount: i128) {
    let balance = read_balance(&e, to.clone());
    write_balance(&e, to, balance + amount);
}

pub fn set_metadata(e: &Env, name: String, symbol: String, decimals: u32) {
    e.storage().instance().set(&DataKey::TokenName, &name);
    e.storage().instance().set(&DataKey::TokenSymbol, &symbol);
    e.storage().instance().set(&DataKey::TokenDecimals, &decimals);
}
