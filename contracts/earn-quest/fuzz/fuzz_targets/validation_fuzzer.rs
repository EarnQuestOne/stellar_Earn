#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use soroban_sdk::{Env, Symbol};

#[derive(Arbitrary, Debug)]
struct ValidationInput {
    symbol_data: [u8; 64],
    amount: i128,
    time_offset: u64,
}

fuzz_target!(|data: ValidationInput| {
    let env = Env::default();
    
    // Test symbol validation with random data
    let symbol_str = std::str::from_utf8(&data.symbol_data).unwrap_or("test");
    let safe_symbol = symbol_str
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_')
        .take(32)
        .collect::<String>();
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let sym = Symbol::new(&env, &safe_symbol);
        let _ = earn_quest::validation::validate_symbol_length(&sym);
    }));
    
    // Test reward amount validation
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = earn_quest::validation::validate_reward_amount(data.amount);
    }));
    
    // Test deadline validation
    let current_time = env.ledger().timestamp();
    let deadline = current_time + data.time_offset;
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let _ = earn_quest::validation::validate_deadline(&env, deadline);
    }));
});
