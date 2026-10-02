# Contract Upgrade Rollback Strategy

## Overview

This document describes the rollback strategy for failed contract upgrade deployments on the EarnQuest platform.

Soroban smart contracts on Stellar are upgradeable — the contract code (WASM) can be replaced while preserving all on-chain storage and state. However, a failed or buggy upgrade can leave the contract in an unusable state. This rollback strategy ensures you can always recover.

---

## How It Works

### Before Every Upgrade

The deploy script automatically saves a **snapshot** before executing any `--upgrade`:

```
scripts/deploy/.snapshots/snapshot_YYYYMMDD_HHMMSS_pre-upgrade.json
```

Each snapshot contains:

- Contract ID
- WASM hash (local file + on-chain)
- Git commit and branch at time of deploy
- Network and RPC details
- Timestamp

### If an Upgrade Fails

Run the rollback script to revert to the previous WASM:

```bash
# Rollback to the most recent snapshot
./scripts/deploy/rollback-contract.sh --rollback

# Rollback to a specific snapshot
./scripts/deploy/rollback-contract.sh --rollback --snapshot .snapshots/snapshot_20260101_000000_pre-upgrade.json

# List all available snapshots
./scripts/deploy/rollback-contract.sh --list
```

The rollback script:

1. Reads the pre-upgrade snapshot
2. Re-uploads the previous WASM to the Stellar network
3. Calls `upgrade` on the contract with the previous WASM hash
4. Verifies the contract is responsive
5. Saves a `post-rollback` snapshot for audit trail

---

## Key Principle: State is Preserved

Soroban contract upgrades **only replace the code** — all storage (quests, users, submissions, escrow balances) remains untouched. Rolling back is safe and does not affect user funds or data.

---

## Usage Reference

### Deploy with Auto-Snapshot (Recommended)

```bash
# Upgrade an existing contract (snapshot saved automatically)
EXISTING_CONTRACT_ID=C... ./scripts/deploy/deploy-contract.sh --upgrade

# If the upgrade causes issues, immediately rollback
EXISTING_CONTRACT_ID=C... ./scripts/deploy/rollback-contract.sh --rollback
```

### Manual Snapshot

```bash
# Save current state before making any changes
EXISTING_CONTRACT_ID=C... ./scripts/deploy/rollback-contract.sh --snapshot-only
```

### Verify Current Deployment

```bash
# Check if contract is responsive after upgrade or rollback
EXISTING_CONTRACT_ID=C... ./scripts/deploy/rollback-contract.sh --verify
```

### List All Snapshots

```bash
./scripts/deploy/rollback-contract.sh --list
```

---

## Environment Variables

| Variable               | Required               | Description                               |
| ---------------------- | ---------------------- | ----------------------------------------- |
| `SOROBAN_SECRET_KEY`   | Yes (for on-chain ops) | Stellar secret key with upgrade authority |
| `EXISTING_CONTRACT_ID` | Yes                    | The contract ID to upgrade or rollback    |
| `SOROBAN_RPC_URL`      | No                     | RPC endpoint (default: testnet)           |

---

## Rollback Decision Tree

```
Upgrade deployed
      │
      ▼
Contract responsive? ──Yes──► Monitor for issues
      │
      No
      │
      ▼
Run --verify to confirm failure
      │
      ▼
Run --rollback (uses latest snapshot)
      │
      ▼
Contract responsive? ──Yes──► Investigate root cause
      │
      No
      │
      ▼
Check snapshot WASM path exists
      │
      ▼
Script rebuilds from git commit
      │
      ▼
Contact team / manual intervention
```

---

## Mainnet Safety

When running `--mainnet`, the rollback script requires explicit confirmation:

```
⚠️  You are rolling back on MAINNET. This is irreversible.
  Type 'yes' to confirm mainnet rollback:
```

This prevents accidental rollbacks in production.

---

## Snapshot Storage

Snapshots are stored in `scripts/deploy/.snapshots/` and are **gitignored** by default since they may contain sensitive deployment info. Back them up separately for mainnet deployments.

---

## Running Tests

```bash
bash scripts/deploy/rollback-contract.test.sh
```

---

## Related Files

| File                                       | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `scripts/deploy/rollback-contract.sh`      | Main rollback script                               |
| `scripts/deploy/rollback-contract.test.sh` | Tests for rollback script                          |
| `scripts/deploy/deploy-contract.sh`        | Main deploy script (calls snapshot before upgrade) |
| `scripts/deploy/.snapshots/`               | Auto-generated snapshot directory (gitignored)     |
