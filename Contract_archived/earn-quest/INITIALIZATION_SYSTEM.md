# Contract Initialization and Upgrade System

## Overview

This document describes the contract initialization and upgrade system implemented for the Earn Quest contract. This system provides secure initialization with admin management and upgrade authorization capabilities using Soroban patterns.

## Architecture

### Core Components

#### 1. **Initialization Module** (`init.rs`)
The initialization module handles all initialization-related operations:

- **`initialize(env, admin)`** - Initializes the contract with an admin address
- **`get_config(env)`** - Retrieves current contract configuration
- **`update_config(env, admin, new_admin)`** - Updates the admin address
- **`authorize_upgrade(env, admin)`** - Authorizes contract upgrade (admin only)
- **`is_initialized(env)`** - Checks if contract is initialized
- **`get_version(env)`** - Returns current contract version
- **`get_admin(env)`** - Returns the current admin address

#### 2. **Storage Module** (`storage.rs`)
Extended with initialization support:

- New `StorageKey::Config` variant for storing contract configuration
- `set_config(env, config)` - Stores contract configuration
- `get_config(env)` - Retrieves contract configuration
- `is_initialized(env)` - Checks initialization status

#### 3. **Error Types** (`errors.rs`)
New error variants for initialization:

- `AlreadyInitialized` (22) - Contract already initialized
- `NotInitialized` (23) - Contract not yet initialized
- `InvalidAdmin` (24) - Invalid admin address
- `UnauthorizedUpgrade` (25) - Unauthorized upgrade attempt
- `InvalidVersionNumber` (26) - Invalid version number

#### 4. **Contract Interface** (`lib.rs`)
Seven new public functions added to the contract:

```rust
pub fn initialize(env: Env, admin: Address) -> Result<(), Error>
pub fn get_config(env: Env) -> Result<ContractConfig, Error>
pub fn update_config(env: Env, admin: Address, new_admin: Option<Address>) -> Result<(), Error>
pub fn authorize_upgrade(env: Env, admin: Address) -> Result<(), Error>
pub fn is_initialized(env: Env) -> bool
pub fn get_version(env: Env) -> Result<u32, Error>
pub fn get_admin(env: Env) -> Result<Address, Error>
```

## Contract Configuration

```rust
#[soroban_sdk::contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractConfig {
    pub admin: Address,           // Admin with upgrade/config permissions
    pub version: u32,             // Current contract version (v1 = 1)
    pub initialized: bool,        // Whether contract is initialized
}
```

## Usage Guide

### 1. Contract Deployment and Initialization

```rust
// 1. Deploy contract (empty state initially)
let contract_id = deploy_contract();

// 2. Initialize with admin
let admin = Address::generate(&env);
client.initialize(&admin)?;  // OK - First initialization

// 3. Any subsequent initialization attempts fail
client.initialize(&other_address)?;  // ERROR: AlreadyInitialized
```

### 2. Admin Management

```rust
let admin = client.get_admin(&env)?;        // Get current admin
let config = client.get_config(&env)?;      // Get full config
let version = client.get_version(&env)?;    // Get contract version
let is_init = client.is_initialized(&env);  // Check initialization status
```

### 3. Changing Admin Address

```rust
// Current admin updates configuration
let new_admin = Address::generate(&env);
client.update_config(&current_admin, &Some(new_admin))?;

// New admin can now authorize upgrades
client.authorize_upgrade(&new_admin)?;  // OK
client.authorize_upgrade(&old_admin)?;  // ERROR: UnauthorizedUpgrade
```

### 4. Authorization Checks

```rust
// Only admin can authorize upgrades
client.authorize_upgrade(&admin)?;           // OK - Admin authorized
client.authorize_upgrade(&non_admin)?;       // ERROR: UnauthorizedUpgrade

// Contract must be initialized first
if !client.is_initialized(&env) {
    return Err(Error::NotInitialized);
}
```

## Security Features

### 1. **Re-initialization Prevention**
- Once initialized, `initialize()` cannot be called again
- Returns `AlreadyInitialized` error on subsequent attempts
- Protects against accidental or malicious re-initialization

### 2. **Admin-only Operations**
- All configuration changes require admin authorization
- `update_config()` validates admin address
- `authorize_upgrade()` verifies admin before allowing upgrades
- Admin authentication enforced via `address.require_auth()`

### 3. **Version Tracking**
- Contract version stored in configuration
- Current version: `1` (defined by `CONTRACT_VERSION` constant)
- Enables future version management for upgradeable contracts

### 4. **Authorization Validation**
- All mutating operations check initialization status
- Authorization checks through address authentication
- Admin privileges cannot be escalated

### 5. **Storage Security**
- Configuration stored in persistent contract storage
- Single configuration source of truth
- Immutable initialization once complete

## State Transitions

```
┌─────────────────────┐
│  Not Initialized    │
│  (Fresh Deploy)     │
└──────────┬──────────┘
           │ initialize()
           ▼
┌─────────────────────────────────┐
│ Initialized                     │
│ - Admin Set                     │
│ - Version Tracked               │
│ - Configuration Stored          │
└──────┬──────────────────────────┘
       │ update_config() (admin)
       ▼ authorize_upgrade() (admin)
┌────────────────────────┐
│ Ready for Operations   │
│ - Admin can manage     │
│ - Upgrades authorized  │
│ - Configuration stable │
└────────────────────────┘
```

## Testing

Comprehensive test suite in `tests/test_init.rs` covers:

### Initialization Tests
- ✅ Successful initialization
- ✅ Re-initialization prevention
- ✅ Initialization state verification

### Configuration Tests
- ✅ Get configuration
- ✅ Update admin address
- ✅ Configuration persistence
- ✅ Configuration access before initialization (fails)

### Authorization Tests
- ✅ Admin can authorize upgrades
- ✅ Non-admin cannot authorize upgrades
- ✅ Authorization before initialization (fails)

### Admin Management Tests
- ✅ Get current admin
- ✅ Change admin address (admin only)
- ✅ Updated admin has correct permissions
- ✅ Previous admin loses permissions

### Version Tests
- ✅ Get contract version
- ✅ Version immutability
- ✅ Version tracking accuracy

### Sequence Tests
- ✅ Complete initialization workflow
- ✅ Multiple admin transfers
- ✅ Permission changes after transfers

## Integration with Quest System

The initialization system integrates seamlessly:

1. **Quest Operations** - Require initialized contract
2. **Admin Only** - Badge granting requires admin (can be extended)
3. **Future Upgrades** - Version tracking enables safe upgrades

### Potential Extensions

```rust
// Future: Restrict quest creation to specific roles
pub fn register_quest(
    env: Env,
    id: Symbol,
    creator: Address,
    ...
) -> Result<(), Error> {
    // Could require creator authorization, admin approval, etc.
    quest::create_quest(&env, id, creator, ...)
}
```

## Migration Guide

If integrating into existing deployment:

1. **Deploy new contract** with initialization support
2. **Call initialize()** with admin address immediately
3. **Verify initialization** with `is_initialized()` check
4. **Update existing features** to use admin privileges
5. **Plan upgrade procedure** using authorization checks

## Constants and Defaults

```rust
// From init.rs
pub const CONTRACT_VERSION: u32 = 1;

// Initialization must happen before other operations
pub const REQUIRES_INITIALIZATION: bool = true;

// Authorization required for admin operations
pub const REQUIRES_AUTH: bool = true;
```

## Error Handling

All initialization functions return `Result<T, Error>`:

```rust
match client.initialize(&admin) {
    Ok(()) => println!("Success"),
    Err(Error::AlreadyInitialized) => println!("Already init"),
    Err(Error::InvalidAdmin) => println!("Bad admin"),
    Err(e) => println!("Other error: {:?}", e),
}
```

## Performance Considerations

- **Storage Operations**: O(1) for config access
- **Auth Checks**: Minimal overhead (Soroban SDK optimized)
- **No Loops**: All operations are constant-time
- **Persistent Storage**: One persistent key for all config

## Future Enhancements

1. **Multi-admin Support** - Support multiple admins with roles
2. **Pause Mechanism** - Admin can pause contract operations
3. **Emergency Upgrade** - Fast-track upgrade for critical bugs
4. **Audit Trail** - Log all admin actions
5. **Time-lock** - Delay upgrades for safety
6. **DAO Governance** - Admin functions via voting

## Compliance and Standards

- ✅ Soroban SDK best practices
- ✅ Rust no_std compliance
- ✅ Security patterns for contract initialization
- ✅ Testnet compatible
- ✅ Mainnet ready

## Troubleshooting

### Problem: "NotInitialized" Error
**Solution**: Call `initialize()` first
```rust
if !client.is_initialized(&env) {
    client.initialize(&admin)?;
}
```

### Problem: "Unauthorized" Error on update_config
**Solution**: Ensure you're calling with current admin
```rust
let current_admin = client.get_admin(&env)?;
client.update_config(&current_admin, &Some(new_admin))?;
```

### Problem: "AlreadyInitialized" Error
**Solution**: Contract can only initialize once. Check if already initialized:
```rust
if !client.is_initialized(&env) {
    client.initialize(&admin)?;
}
```

## Summary

The Contract Initialization and Upgrade System provides:

1. **Secure Initialization** - Single admin setup, re-initialization prevention
2. **Admin Management** - Transferable admin privileges
3. **Version Tracking** - Support for future upgrades
4. **Authorization** - Controlled upgrade authorization
5. **Persistent State** - Configuration stored securely
6. **Comprehensive Testing** - 13+ unit tests with edge cases

All acceptance criteria are met with comprehensive error handling and security measures.
