# Quick Reference: Initialization System API

## Contract Functions

### Initialize Contract
```rust
client.initialize(&admin)
```
- One-time initialization with admin setup
- Stores configuration persistently
- Panics on re-initialization

### Check Initialization Status
```rust
let is_init = client.is_initialized()
```
- Returns `bool` - quick status check
- No error possible

### Get Configuration
```rust
let config = client.get_config()
// config.admin: Address
// config.version: u32
// config.initialized: bool
```
- Fails if not initialized
- Returns full `ContractConfig`

### Get Admin
```rust
let admin = client.get_admin()
```
- Fails if not initialized
- Returns `Address`

### Get Version
```rust
let version = client.get_version()
```
- Fails if not initialized
- Returns `u32`

### Update Configuration
```rust
client.update_config(&current_admin, &Some(new_admin))
```
- Admin-only operation
- Can transfer admin to new address
- Pass `&None` to keep admin unchanged

### Authorize Upgrade
```rust
client.authorize_upgrade(&admin)
```
- Validates admin authorization
- Returns on success
- Fails if not admin or not initialized

## Error Codes

| Error | Code | Meaning |
|-------|------|---------|
| `AlreadyInitialized` | 22 | Contract already initialized |
| `NotInitialized` | 23 | Contract must be initialized first |
| `InvalidAdmin` | 24 | Invalid admin address |
| `UnauthorizedUpgrade` | 25 | Caller is not admin |
| `InvalidVersionNumber` | 26 | Invalid version provided |

## Common Patterns

### Initialize on Deployment
```rust
let admin = Address::generate(&env);
client.initialize(&admin);
```

### Verify Initialization
```rust
if !client.is_initialized() {
    client.initialize(&admin)?;
}
```

### Transfer Admin
```rust
let new_admin = Address::generate(&env);
client.update_config(&old_admin, &Some(new_admin))?;
```

### Authorize and Upgrade
```rust
client.authorize_upgrade(&admin)?;
// Perform upgrade...
```

### Safe Admin Migration
```rust
// 1. Current admin validates
let admin = client.get_admin()?;

// 2. Prepare new admin
let new_admin = Address::generate(&env);

// 3. Transfer admin
client.update_config(&admin, &Some(new_admin))?;

// 4. New admin tests authorization
client.authorize_upgrade(&new_admin)?;
```

## Testing Patterns

### Integration Test Template
```rust
#[test]
fn test_initialization() {
    let env = Env::default();
    env.mock_all_auths();  // Mock authorization
    let client = EarnQuestContractClient::new(
        &env,
        &env.register_contract(None, EarnQuestContract)
    );

    let admin = Address::generate(&env);
    
    // Initialize
    client.initialize(&admin);
    
    // Verify
    assert!(client.is_initialized());
    assert_eq!(client.get_admin(), admin);
}
```

### Testing Error Cases
```rust
// Use try_ prefix for methods that can error
let result = client.try_initialize(&admin);
assert!(result.is_err());

// Or catch panic
let result = std::panic::catch_unwind(|| {
    client.initialize(&admin);
});
assert!(result.is_err());
```

## Storage

Configuration stored with:
- **Key**: `StorageKey::Config`
- **Type**: `ContractConfig`
- **Scope**: `persistent()`
- **Lifetime**: Forever (immutable after init)

## Version Numbers

- **Current**: 1
- **Format**: u32
- **Constant**: `CONTRACT_VERSION = 1`
- **Upgrade Path**: Version in config enables version checks

## Best Practices

1. **Initialize First**
   - Always initialize before any quest operations
   - Check `is_initialized()` on contract load

2. **Admin Security**
   - Keep admin address secure
   - Use hardware wallet for mainnet
   - Plan admin transfers carefully

3. **Authorization**
   - Always require auth for admin operations
   - Use `address.require_auth()` pattern
   - Validate admin privileges before actions

4. **Testing**
   - Use `env.mock_all_auths()` in tests
   - Test initialization first
   - Test error paths with `try_` versions

5. **Deployment**
   - Deploy contract
   - Initialize immediately
   - Verify initialization before operations
   - Document admin address

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "NotInitialized" error | Call `initialize()` first |
| "Unauthorized" | Use correct admin address |
| "AlreadyInitialized" | Contract already initialized once |
| Authorization fails | Enable `env.mock_all_auths()` in tests |
| Admin lookup fails | Ensure contract is initialized |

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/init.rs` | Initialization module | 190 |
| `src/lib.rs` | Contract integration | 7 functions |
| `src/storage.rs` | Storage updates | Config persist |
| `src/errors.rs` | Error types | 5 new errors |
| `tests/test_init.rs` | Integration tests | 300, 16 tests |

## Next Steps

1. Deploy contract with initialization
2. Call `initialize(&admin_address)`
3. Verify with `is_initialized()`
4. Plan upgrade procedure
5. Consider admin governance

---

For detailed documentation, see [INITIALIZATION_SYSTEM.md](INITIALIZATION_SYSTEM.md)
