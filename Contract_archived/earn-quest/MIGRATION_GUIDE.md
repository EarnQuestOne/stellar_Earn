# Stellar Earn Contract Migration Guide

## Overview

The Stellar Earn contract uses a robust migration and upgrade framework to allow for contract code updates (WASM) and state schema transformations without losing user data or requiring complicated migrations.

The system is controlled by the administrative address set during contract initialization.

## Architecture

1.  **Version Tracking**: Both the `ContractConfig` and a dedicated `Version` storage key track the current data schema version.
2.  **Migration Registry**: `src/upgrade.rs` contains the sequential migration functions (e.g., `migrate_v1_to_v2`).
3.  **WASM Upgrade**: Uses Soroban's `update_current_contract_wasm` to replace the contract implementation.
4.  **Admin Triggers**: Administrative methods in `src/admin.rs` (exposed via `EarnQuestContract`) allow triggering upgrades and migrations.

## Performing an Upgrade

### Scenario 1: Only Code Change (No Schema Change)

If you have a new WASM file that fixes a bug but doesn't change the data structure:

1.  Build the new WASM.
2.  Upload the WASM to the network to get its hash.
3.  Call `upgrade_contract(admin, new_wasm_hash)`.

This will:
- Update the contract's code.
- Run `migrate()` automatically (which will do nothing if `CONTRACT_VERSION` is unchanged).

### Scenario 2: Schema Change (State Migration)

If you are changing the data structures (e.g., adding a new field to `Quest`):

1.  Increment `CONTRACT_VERSION` in `src/init.rs`.
2.  Implement the migration function in `src/upgrade.rs` (e.g., `migrate_v2_to_v3`).
3.  Implement optional rollback logic in `rollback_v3_to_v2`.
4.  Upload the new WASM.
5.  Call `upgrade_contract(admin, new_wasm_hash)`.

This will:
- Update the code.
- Automatically execute the `migrate()` function, which detects the version mismatch and runs all migrations up to the new `CONTRACT_VERSION`.

## Rollback Procedures

In case of a failed migration or severe bug in a new version, the admin can trigger a state rollback:

```rust
trigger_rollback(admin, target_version)
```

**CAUTION**: Rollbacks are manually implemented and should be thoroughly tested. They may result in data loss if they involve deleting fields or reverting irreversible state changes.

## Security

- All upgrade and migration functions require authorization from the `admin` address.
- `require_auth()` is called on every administrative trigger.

## Troubleshooting

- **InvalidVersionNumber**: Occurs if you attempt to migrate to a version that doesn't exist or rollback to a version equal to or higher than the current one.
- **UnauthorizedUpgrade**: Occurs if a non-admin address attempts to trigger an upgrade.
