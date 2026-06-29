#![no_main]
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{Env, Vec, String};

fuzz_target!(|data: Vec<(u32, i128, u8)>| {
    let env = Env::default();
    let mut approvals: Vec<(String, String, i128)> = Vec::new(&env);
    for item in data.iter() {
        let s_id = String::from_str(&env, "sub_id");
        let addr = String::from_str(&env, "addr");
        approvals.push_back((s_id, addr, item.1));
    }
});
