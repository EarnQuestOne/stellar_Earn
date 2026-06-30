#![no_main]
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{Env, Vec, String};

fuzz_target!(|data: Vec<(u32, Vec<u8>, i128)>| {
    let env = Env::default();
    let mut batch: Vec<(String, String, i128, String)> = Vec::new(&env);
    for item in data.iter() {
        if let (Ok(id_str), Ok(asset_str)) = (std::str::from_utf8(&item.1), std::str::from_utf8(&item.1)) {
            let q_id = String::from_str(&env, id_str);
            let r_asset = String::from_str(&env, asset_str);
            let verifier = String::from_str(&env, "v1");
            batch.push_back((q_id, r_asset, item.2, verifier));
        }
    }
});
