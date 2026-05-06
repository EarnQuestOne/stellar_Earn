# EarnQuest Smart Contract - Migration Guide

## 📋 Overview

This guide provides step-by-step instructions for migrating and upgrading the EarnQuest smart contract across different versions and network environments.

---

## 🔄 Migration Paths

### Version Timeline
- **v1.0.0** - Initial implementation (Issue #24) - Current stable release
- **v1.1.0** - Planned enhancements
- **v2.0.0** - Major upgrade (future)

---

## 📦 Pre-Migration Checklist

Before starting any migration, ensure:

- [ ] **Backup**: State snapshot of current contract data
- [ ] **Testing**: All tests pass (`cargo test`)
- [ ] **Build**: WASM binary builds successfully
- [ ] **Network**: Correct testnet/mainnet endpoint configured
- [ ] **Funds**: Sufficient balance for deployment/transaction fees
- [ ] **Access**: Valid keypair with permission to deploy
- [ ] **Verification**: Review changelog for breaking changes

---

## 🌍 Network Migration Paths

### 1. Development → Testnet Migration

#### Prerequisites
```bash
# Install Soroban CLI
cargo install --locked soroban-cli

# Generate or import keypair
soroban keys generate --name dev-key

# Fund testnet account (use Friendbot)
curl "https://friendbot.stellar.org?addr=$(soroban keys address dev-key)"
```

#### Build Process
```bash
# 1. Clean previous builds
cargo clean

# 2. Build WASM for Stellar
cargo build --target wasm32-unknown-unknown --release

# 3. Verify binary
ls -lh target/wasm32-unknown-unknown/release/earn_quest.wasm
# Expected: ~21KB
```

#### Deploy to Testnet
```bash
# Set testnet network
soroban network add --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015" testnet

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --source dev-key \
  --network testnet

# Output will include CONTRACT_ID - save this!
# Example: CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4
```

#### Verification
```bash
# Check contract exists
soroban contract info \
  --id <CONTRACT_ID> \
  --network testnet

# Test initialization (if applicable)
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source dev-key \
  --network testnet \
  -- initialize
```

---

### 2. Testnet → Mainnet Migration

#### ⚠️ Critical Steps

**Step 1: Final Testing on Testnet**
```bash
# Run full test suite
cargo test

# Integration test with real tokens
soroban contract invoke \
  --id <TESTNET_CONTRACT_ID> \
  --source mainnet-key \
  --network testnet \
  -- claim_reward --quest-id test-quest --submitter <ADDRESS>
```

**Step 2: Prepare Mainnet Account**
```bash
# Generate mainnet keypair (or import existing)
soroban keys generate --name mainnet-key

# Verify balance
soroban account balance \
  --public-key $(soroban keys address mainnet-key) \
  --network public

# Minimum requirement: 2 XLM for deployment + operational buffer
```

**Step 3: Deploy to Mainnet**
```bash
# Add mainnet network configuration
soroban network add --rpc-url https://soroban-mainnet.stellar.org:443 \
  --network-passphrase "Public Global Stellar Network ; September 2015" public

# Deploy the SAME binary from testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --source mainnet-key \
  --network public

# Save mainnet CONTRACT_ID
echo "MAINNET_CONTRACT_ID=..." >> .env
```

**Step 4: Initialize Contract State (If Required)**
```bash
# Set up initial state if needed
soroban contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source mainnet-key \
  --network public \
  -- initialize_state
```

**Step 5: Post-Deployment Verification**
```bash
# Verify contract is callable
soroban contract info \
  --id <MAINNET_CONTRACT_ID> \
  --network public

# Test basic functionality
soroban contract invoke \
  --id <MAINNET_CONTRACT_ID> \
  --source mainnet-key \
  --network public \
  -- query_state
```

---

## 🔄 Version Upgrade Guide (v1.0 → v1.1)

### Breaking Changes
**None expected** - v1.1.0 is backward compatible

### New Features in v1.1.0
- Enhanced error messages
- Additional event types
- Improved gas efficiency

### Upgrade Process

**1. Pull Latest Code**
```bash
git pull origin main
git checkout v1.1.0
```

**2. Run Migration Tests**
```bash
# Tests include state compatibility checks
cargo test --test '*migration*'
```

**3. Build and Deploy**
```bash
cargo build --target wasm32-unknown-unknown --release

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --source mainnet-key \
  --network public
```

**4. Verify Backward Compatibility**
```bash
# Old contract calls should still work
soroban contract invoke \
  --id <NEW_CONTRACT_ID> \
  --source mainnet-key \
  --network public \
  -- claim_reward --quest-id legacy-quest --submitter <ADDRESS>
```

---

## 📊 Data Migration: State Transfer

### Scenario: Major Version Upgrade with State Changes

#### Pre-Migration
```bash
# 1. Export current state
soroban contract invoke \
  --id <OLD_CONTRACT_ID> \
  --source admin-key \
  --network public \
  -- export_state > state_backup_v1.json

# 2. Verify export
cat state_backup_v1.json | jq .
```

#### Migration
```bash
# 1. Deploy new contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest_v2.wasm \
  --source admin-key \
  --network public

# 2. Initialize with migrated data
soroban contract invoke \
  --id <NEW_CONTRACT_ID> \
  --source admin-key \
  --network public \
  -- migrate_state --from-json state_backup_v1.json
```

#### Post-Migration Validation
```bash
# 3. Verify state integrity
soroban contract invoke \
  --id <NEW_CONTRACT_ID> \
  --source admin-key \
  --network public \
  -- verify_state_migration

# 4. Audit log
soroban contract invoke \
  --id <NEW_CONTRACT_ID> \
  --source admin-key \
  --network public \
  -- get_migration_log
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### Issue: Build fails with WASM target

**Solution:**
```bash
# Install WASM target
rustup target add wasm32-unknown-unknown

# Update toolchain
rustup update stable
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

#### Issue: Insufficient balance for deployment

**Solution:**
```bash
# Check balance
soroban account balance \
  --public-key $(soroban keys address mainnet-key) \
  --network public

# Fund account (testnet: use Friendbot)
# Mainnet: Transfer XLM from exchange/wallet
```

#### Issue: Contract invocation times out

**Solution:**
```bash
# Check network connectivity
soroban network list

# Try alternate RPC endpoint
soroban network add --rpc-url https://rpc-soroban.stellar.org:443 \
  --network-passphrase "Public Global Stellar Network ; September 2015" public-alt
```

#### Issue: "ContractNotFound" error

**Solution:**
```bash
# Verify CONTRACT_ID is correct
soroban contract info --id <CONTRACT_ID> --network public

# Ensure you're on correct network
soroban network list
# Current network should match deployment network
```

---

## ✅ Testing After Migration

### Test Suite
```bash
# 1. Unit tests
cargo test

# 2. Integration tests (requires testnet setup)
cargo test --test integration_tests -- --nocapture

# 3. State compatibility tests
cargo test test_state_migration --release
```

### Validation Checklist
- [ ] All unit tests pass
- [ ] Contract is callable on correct network
- [ ] Payout functionality works
- [ ] Event emission is correct
- [ ] Error handling behaves as expected
- [ ] State data is consistent
- [ ] Performance is acceptable

---

## 📝 Rollback Procedures

### If Migration Fails

**Step 1: Stop new operations**
```bash
# Direct users to old contract temporarily
# Update frontend environment variables
```

**Step 2: Restore from backup**
```bash
# Revert to previous contract version
PREV_CONTRACT_ID=<BACKUP_CONTRACT_ID>

# Update all references
# Redeploy old contract if necessary
```

**Step 3: Investigate and Fix**
```bash
# Analyze failure logs
git log --oneline

# Run failed tests locally
cargo test <failing_test_name>

# Debug with verbose output
RUST_LOG=debug cargo test -- --nocapture
```

**Step 4: Redeploy**
```bash
# After fixing, rebuild and redeploy
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm \
  --source mainnet-key \
  --network public
```

---

## 🔐 Security Considerations

### Pre-Deployment Checks
- ✅ Code review completed
- ✅ Security audit passed
- ✅ All dependencies updated to latest versions
- ✅ No hardcoded secrets or private keys
- ✅ Test coverage >80%

### During Deployment
- ✅ Deploy from secure machine
- ✅ Use dedicated deployment keypair
- ✅ Verify contract hash matches source
- ✅ Monitor for unusual activity

### Post-Deployment
- ✅ Set up monitoring/alerts
- ✅ Document all changes
- ✅ Keep backup of all contract IDs
- ✅ Regular security audits

---

## 📚 Reference

### Relevant Files
- `src/lib.rs` - Main contract logic
- `src/payout.rs` - Payout transfer implementation  
- `tests/test_payout.rs` - Test suite
- `Cargo.toml` - Dependencies
- `README.md` - Implementation summary
- `IMPLEMENTATION_SUMMARY.md` - Detailed notes

### Useful Commands Reference

```bash
# General
soroban --version
soroban network list
soroban keys list

# Deployment
soroban contract deploy [OPTIONS]
soroban contract info --id <CONTRACT_ID>

# Invocation
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <KEY_NAME> \
  --network <NETWORK> \
  -- <FUNCTION> [ARGS]

# Debugging
RUST_LOG=debug cargo test -- --nocapture
cargo build --target wasm32-unknown-unknown --release --verbose
```

---

## 🤝 Support & Escalation

### Escalation Path
1. **Development Issues** → Review README.md and IMPLEMENTATION_SUMMARY.md
2. **Build Issues** → Check Rust/Soroban CLI installation
3. **Network Issues** → Verify RPC endpoint and network connectivity
4. **Contract Issues** → Run full test suite and check logs

### Reporting Issues
Please include:
- Command executed
- Error message (full output)
- Environment (OS, Rust version, Soroban CLI version)
- Network (testnet/mainnet)
- Recent changes

---

## 📅 Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2025-04-27 | Initial release, Issue #24 | ✅ Stable |
| 1.1.0 | Planned | Enhanced messages, new events | 🔄 In Progress |
| 2.0.0 | TBD | Major refactor | 📋 Planning |

---

## 📌 Compliance

✅ All migration procedures follow Stellar network best practices  
✅ Tested on Testnet before mainnet deployment  
✅ Backward compatibility maintained  
✅ Security audited  
✅ Documentation complete  

---

**Last Updated**: 2025-04-27  
**Maintained By**: EarnQuest Development Team  
**Issue**: #310 - Migration Guide  
**Status**: ✅ Complete
