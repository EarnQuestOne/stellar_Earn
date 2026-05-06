# Fuzz Testing for Earn-Quest Contract

This directory contains fuzz testing infrastructure for the earn-quest Soroban smart contract using `cargo-fuzz`.

## Overview

Fuzz testing automatically generates random inputs to find edge cases, bugs, and potential vulnerabilities in the contract code. The fuzzers target critical contract functions including:

- **Quest Creation**: Tests quest registration with various input combinations
- **Submission**: Tests quest submission functionality
- **Validation**: Tests input validation functions

## Prerequisites

1. Install Rust nightly toolchain:
   ```bash
   rustup toolchain install nightly
   rustup default nightly
   ```

2. Install cargo-fuzz:
   ```bash
   cargo install cargo-fuzz
   ```

## Running Fuzz Tests

### Run all fuzzers

```bash
cd fuzz
cargo fuzz run quest_creation_fuzzer
cargo fuzz run submission_fuzzer
cargo fuzz run validation_fuzzer
```

### Run with specific options

```bash
# Run for a specific duration
cargo fuzz run quest_creation_fuzzer -- -max_total_time=3600

# Run with multiple jobs (parallel)
cargo fuzz run quest_creation_fuzzer -j 4

# Run with verbose output
cargo fuzz run quest_creation_fuzzer -- -verbosity=1
```

### Run until a crash is found

```bash
cargo fuzz run quest_creation_fuzzer -- -max_total_time=86400
```

## Understanding Fuzz Results

When a fuzzer finds a crash:
1. The crash input is saved to `fuzz/artifacts/<fuzzer_name>/`
2. You can reproduce the crash with:
   ```bash
   cargo fuzz run quest_creation_fuzzer fuzz/artifacts/quest_creation_fuzzer/crash-file
   ```

## Adding New Fuzz Targets

1. Add a new binary to `fuzz/Cargo.toml`:
   ```toml
   [[bin]]
   name = "new_fuzzer"
   path = "fuzz_targets/new_fuzzer.rs"
   test = false
   doc = false
   ```

2. Create the fuzzer in `fuzz/fuzz_targets/new_fuzzer.rs`

3. Run the new fuzzer:
   ```bash
   cargo fuzz run new_fuzzer
   ```

## Best Practices

- Use `catch_unwind` to prevent panics from stopping the fuzzer
- Use the `arbitrary` crate to generate structured random inputs
- Focus on public API functions that accept external input
- Test boundary conditions and edge cases
- Run fuzzers for extended periods to maximize coverage

## Integration with CI

Fuzz tests can be integrated into CI/CD pipelines to run for a fixed duration on each pull request:

```yaml
- name: Run fuzz tests
  run: |
    cargo fuzz run quest_creation_fuzzer -- -max_total_time=300
    cargo fuzz run validation_fuzzer -- -max_total_time=300
```

## References

- [cargo-fuzz documentation](https://github.com/rust-fuzz/cargo-fuzz)
- [libfuzzer documentation](https://llvm.org/docs/LibFuzzer.html)
- [Soroban testing guide](https://soroban.stellar.org/docs/getting-started/testing)
