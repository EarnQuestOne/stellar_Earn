# Audit Test Execution Guide

**Version:** 1.0  
**Date:** May 30, 2026

## Overview

This guide explains how to execute the audit test suite and interpret results.

## Test Suite Organization

### Test Files

```
audit/
├── tests/
│   └── audit_tests.rs          # Main audit test suite
├── documentation/              # All documentation files
└── README.md                  # This guide's parent directory
```

### Test Categories

1. **Invariant Tests** - Verify mathematical properties hold
2. **Security Tests** - Attempt known attack scenarios
3. **Edge Case Tests** - Test boundary conditions
4. **Property Tests** - Verify properties across many scenarios
5. **Integration Tests** - Test multi-component workflows

## Running Tests

### Prerequisites

```bash
# Install Rust
rustup update stable
rustup install 1.70+

# Install Soroban CLI
cargo install soroban-cli@21.7.4+

# Navigate to contract directory
cd contracts/earn-quest
```

### Running All Tests

```bash
# Run all tests with output
cargo test -- --nocapture

# Run specific test module
cargo test audit_tests --lib -- --nocapture

# Run with verbose output
cargo test audit_tests -- --nocapture --test-threads=1
```

### Running Specific Test Categories

```bash
# Invariant tests only
cargo test audit_tests::audit_tests::test_invariant --lib -- --nocapture

# Security tests only
cargo test audit_tests::audit_tests::test_security --lib -- --nocapture

# Edge case tests only
cargo test audit_tests::audit_tests::test_edge_case --lib -- --nocapture

# Property tests only
cargo test audit_tests::audit_tests::test_property --lib -- --nocapture

# Integration tests only
cargo test audit_tests::audit_tests::test_integration --lib -- --nocapture
```

### Test Coverage

```bash
# Generate coverage report (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage/

# Generate LLVM coverage
cargo tarpaulin --engine llvm --out Html

# View coverage in browser
open coverage/tarpaulin-report.html
```

## Test Naming Convention

### Pattern

```
test_[category]_[component]_[scenario]
```

### Examples

```
test_invariant_fund_conservation_create_quest
test_security_unauthorized_fund_access
test_edge_case_zero_amount
test_property_idempotent_reads
test_integration_complete_quest_flow
```

### Categories

- `invariant_*` - Invariant verification tests
- `security_*` - Security scenario tests
- `edge_case_*` - Boundary condition tests
- `property_*` - Property-based tests
- `integration_*` - Multi-component workflow tests

## Test Execution Results

### Expected Output

```
running 45 tests

test audit_tests::audit_tests::test_invariant_authorization_invariant_unauthorized_access ... ok
test audit_tests::audit_tests::test_invariant_fund_conservation_invariant_escrow_release ... ok
test audit_tests::audit_tests::test_security_unauthorized_fund_access ... ok
...

test result: ok. 45 passed; 0 failed; 0 ignored; 15 measured

   Compiling earn_quest v0.1.0
    Finished test [unoptimized + debuginfo] target(s) in 2.34s
```

### Interpreting Results

| Status     | Meaning              | Action                 |
| ---------- | -------------------- | ---------------------- |
| `ok`       | Test passed          | No action needed       |
| `FAILED`   | Test failed          | Review failure details |
| `ignored`  | Test skipped         | May need debugging     |
| `measured` | Performance measured | Review performance     |

## Debugging Failed Tests

### View Detailed Failure

```bash
# Run with full failure output
cargo test audit_tests::test_name -- --nocapture --show-output

# Run single test with debugging
RUST_BACKTRACE=1 cargo test audit_tests::test_name -- --nocapture --test-threads=1
```

### Common Issues

### Issue: Test Panics

**Symptom:** Thread panic in test

**Debugging:**

```bash
# Run with full backtrace
RUST_BACKTRACE=full cargo test audit_tests::test_name

# Look for line numbers in stack trace
# Check the assertion that failed
```

**Solution:**

- Review test assertions
- Verify mock setup in test
- Check test data validity

---

### Issue: Timeout

**Symptom:** Test takes too long and times out

**Debugging:**

```bash
# Increase test timeout
cargo test audit_tests::test_name -- --nocapture --test-threads=1 --timeout=60

# Check for infinite loops
# Review for expensive operations
```

**Solution:**

- Optimize test performance
- Add bounds checking
- Use smaller test data

---

### Issue: State Persistence

**Symptom:** Test result varies based on execution order

**Debugging:**

```bash
# Run tests in isolation
cargo test audit_tests::test_name -- --nocapture --test-threads=1

# Run tests in random order
cargo test audit_tests -- --nocapture --test-threads=1
```

**Solution:**

- Ensure each test sets up its own state
- Don't rely on global state
- Reset environment between tests

---

## Test Documentation

### Test Template

```rust
#[test]
fn test_category_component_scenario() {
    // 1. Setup
    let env = Env::default();
    let actor = Address::random(&env);
    setup_contract(&env, &actor);

    // 2. Execute
    // Perform the operation being tested

    // 3. Verify
    // Assert expected behavior
    assert!(condition, "descriptive error message");

    // 4. Invariant Check
    // Verify invariants still hold
    assert_invariants_hold(&env);
}
```

### Documentation Sections

Within test comments:

```rust
#[test]
fn test_example() {
    // Test Name: Clear description
    // Purpose: What this test verifies
    // Preconditions: What must be true
    // Expected Result: What should happen
    // Postconditions: What should be true after

    // Setup
    let env = Env::default();

    // ... test code ...
}
```

## Performance Benchmarking

### Running Benchmarks

```bash
# Run benchmarks (if configured)
cargo bench --lib

# Run specific benchmark
cargo bench audit_tests
```

### Interpreting Benchmark Results

```
running 1 test
test audit_tests::bench_complex_operation ... bench:  1,234,567 ns/iter (+/- 12,345)

test result: ok. 0 passed; 0 failed; 0 ignored; 1 measured;
```

**Metrics:**

- `ns/iter` - Nanoseconds per iteration
- `+/-` - Standard deviation
- `1,234,567` - Baseline measurement

##Continuous Integration

### Setting Up CI

```yaml
# .github/workflows/audit-tests.yml
name: Audit Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: 1.70
      - name: Run audit tests
        run: cargo test --lib audit_tests -- --nocapture
      - name: Generate coverage
        run: cargo tarpaulin --out Xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running audit tests..."
cargo test --lib audit_tests -- --nocapture

if [ $? -ne 0 ]; then
    echo "Tests failed, aborting commit"
    exit 1
fi
```

## Test Maintenance

### Adding New Tests

1. **Identify Gap:** Review failed manual tests or missing scenarios
2. **Create Test:** Use appropriate template
3. **Document Purpose:** Add clear comments
4. **Verify Passes:** Run with `cargo test`
5. **Check Coverage:** Ensure new code is covered
6. **Update List:** Add to test inventory

### Updating Existing Tests

```bash
# When contract changes:
1. Compile to find broken tests
2. Review error messages
3. Update test code
4. Verify passes
5. Check coverage impact
```

### Test Inventory

| Test                                                         | Category  | Status | Coverage | Notes                |
| ------------------------------------------------------------ | --------- | ------ | -------- | -------------------- |
| `test_invariant_authorization_invariant_unauthorized_access` | Invariant | Draft  | -        | Needs implementation |
| (Add more as documented)                                     |           |        |          |                      |

## Performance Requirements

### Acceptable Performance

| Operation        | Max Time | Acceptable              |
| ---------------- | -------- | ----------------------- |
| Unit test        | 1s       | Most < 100ms            |
| Integration test | 5s       | Generally < 1s          |
| Full test suite  | 30s      | Should complete in <30s |
| Single assert    | 1ms      | Should be instant       |

### Optimizing Slow Tests

1. Reduce test data size
2. Use mocks instead of real operations
3. Parallelize independent tests
4. Profile to find bottlenecks

## Troubleshooting

### Test Compilation Issues

**Error: Cannot find audit_tests module**

```bash
# Ensure audit/tests/audit_tests.rs exists
ls audit/tests/audit_tests.rs

# Add test path to Cargo.toml if needed
[[test]]
name = "audit_tests"
path = "audit/tests/audit_tests.rs"
```

**Error: Undefined types/functions**

```bash
# Ensure all imports are correct
// At top of audit/tests/audit_tests.rs:
use earn_quest::*;
use soroban_sdk::*;
```

### Test Execution Issues

**Error: MockAuth not available**

```bash
# Ensure testutils feature is enabled
[dev-dependencies]
soroban-sdk = { version = "21.7.4", features = ["testutils"] }
```

**Error: Timestamp functions not working**

```bash
# Use env.ledger() for time-related tests
env.ledger().set_timestamp(1234567890);
let now = env.ledger().timestamp();
```

## Documentation Updates

When updating tests, update:

1. **This File:** Test execution guide
2. **AUDIT_CHECKLIST.md:** Test coverage section
3. **audit_tests.rs:** Test comments
4. **README.md:** Test metrics if changed

## Best Practices

### DO ✓

- ✓ Name tests clearly and descriptively
- ✓ Comment complex test logic
- ✓ Use helper functions for common setup
- ✓ Test one scenario per test
- ✓ Verify invariants after operations
- ✓ Document expected vs actual
- ✓ Use meaningful assertions with messages

### DON'T ✗

- ✗ Duplicate test setup code
- ✗ Test multiple scenarios in one test
- ✗ Use vague test names
- ✗ Forget to verify invariants
- ✗ Leave debugging code in tests
- ✗ Skip error path testing
- ✗ Create dependencies between tests

## Contact & Support

For issues with audit tests:

1. Check this guide first
2. Review test comments for clarification
3. Check AUDIT_CHECKLIST.md for verification requirements
4. Review AUDIT_SPEC.md for contract behavior
5. Check source code for implementation details

## External References

- [Soroban Testing Guide](https://developers.stellar.org/docs/learn/soroban)
- [Cargo Test Documentation](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [Proptest Guide](https://docs.rs/proptest/latest/proptest/)
- [Test-Driven Development in Rust](https://doc.rust-lang.org/book/ch11-00-testing.html)

---

**Document Classification:** Public - Audit Preparation  
**Last Updated:** May 30, 2026
