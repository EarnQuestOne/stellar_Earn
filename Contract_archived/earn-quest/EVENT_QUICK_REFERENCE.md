# Event Emission Quick Reference

## Quick Event Lookup Table

| Event Name | Function | Topics | Data | Priority |
|------------|----------|--------|------|----------|
| `init` | `initialize()` | `("init", admin)` | `version: u32` | Critical |
| `admin_upd` | `update_config()` | `("admin_upd", old_admin)` | `new_admin: Address` | Critical |
| `quest_reg` | `create_quest()` | `("quest_reg", quest_id)` | `Quest` | High |
| `status_upd` | `update_quest_status()` | `("status_upd", quest_id)` | `Quest` | High |
| `quest_full` | `auto_complete_quest_if_full()` | `("quest_full", quest_id)` | `Quest` | High |
| `quest_exp` | `expire_quest()` | `("quest_exp", quest_id)` | `Quest` | High |
| `auto_exp` | `auto_expire_quest_if_deadline_passed()` | `("auto_exp", quest_id)` | `Quest` | High |
| `quest_can` | `cancel_quest()` | `("quest_can", quest_id)` | `Quest` | High |
| `proof_sub` | `submit_proof()` | `("proof_sub", quest_id)` | `submitter: Address` | High |
| `approved` | `approve_submission()` | `("approved", quest_id)` | `submitter: Address` | High |
| `rejected` | `reject_submission()` | `("rejected", quest_id)` | `submitter: Address` | High |
| `sub_paid` | `approve_submission()` | `("sub_paid", quest_id)` | `submitter: Address` | High |
| `escrow_dep` | `deposit_escrow()` | `("escrow_dep", quest_id)` | `amount: i128` | High |
| `escrow_pay` | `process_payout()` | `("escrow_pay", quest_id)` | `recipient: Address` | High |
| `escrow_wd` | `withdraw_unclaimed()` | `("escrow_wd", quest_id)` | `amount: i128` | High |
| `xp_award` | `award_xp()` | `("xp_award", user)` | `xp: u32` | Medium |
| `badge_grant` | `grant_badge()` | `("badge_grant", user)` | `badge: Symbol` | Medium |
| `pause_init` | `initialize_pause_state()` | `("pause_init", timelock)` | `(sigs: u32, grace: u64)` | Critical |
| `pause.state_changed` | `request_pause()` | `("pause", "state_changed")` | `PauseEvent` | Critical |
| `pause.contract_resumed` | `unpause_contract()` | `("pause", "contract_resumed")` | `UnpauseEvent` | Critical |
| `pause_cfg` | `update_pause_config()` | `("pause_cfg", admin)` | `(timelock, sigs, grace)` | Medium |
| `pause_cancel` | `cancel_pause_request()` | `("pause_cancel", admin)` | `timestamp: u64` | Medium |
| `emergency.withdrawal` | `emergency_withdraw()` | `("emergency", "withdrawal")` | `EmergencyWithdrawalEvent` | Critical |
| `upgrade` | `upgrade_contract()` | `("upgrade", admin)` | `wasm_hash: BytesN<32>` | Critical |
| `migrate` | `trigger_migration()` | `("migrate", admin)` | `(old_ver, new_ver)` | Critical |
| `rollback` | `trigger_rollback()` | `("rollback", admin)` | `(old_ver, target_ver)` | Critical |

## Event Categories

### 🔴 Critical Events (Must Monitor)
- Contract lifecycle: `init`, `admin_upd`
- Pause system: `pause_init`, `pause.state_changed`, `pause.contract_resumed`
- Emergency: `emergency.withdrawal`
- Upgrades: `upgrade`, `migrate`, `rollback`

### 🟡 High Priority Events (Core Functionality)
- Quest lifecycle: `quest_reg`, `status_upd`, `quest_full`, `quest_exp`, `auto_exp`, `quest_can`
- Submissions: `proof_sub`, `approved`, `rejected`, `sub_paid`
- Escrow: `escrow_dep`, `escrow_pay`, `escrow_wd`

### 🟢 Medium Priority Events (User Features)
- Reputation: `xp_award`, `badge_grant`
- Pause config: `pause_cfg`, `pause_cancel`

## Common Event Patterns

### Quest Lifecycle Flow
```
quest_reg → proof_sub → approved → sub_paid → escrow_pay → xp_award
                                                          ↓
                                                    quest_full (optional)
```

### Pause System Flow
```
pause_init → request_pause → pause.state_changed → unpause_contract → pause.contract_resumed
                          ↓
                    pause_cancel (optional)
```

### Upgrade Flow
```
upgrade → migrate
       ↓
    rollback (if needed)
```

## Indexer Subscription Recommendations

### Minimal Setup (Core Functionality)
```rust
subscribe_to_events([
    "quest_reg",
    "proof_sub",
    "approved",
    "escrow_pay",
])
```

### Standard Setup (Full Quest Tracking)
```rust
subscribe_to_events([
    "quest_reg", "status_upd", "quest_full", "quest_exp", "quest_can",
    "proof_sub", "approved", "rejected", "sub_paid",
    "escrow_dep", "escrow_pay", "escrow_wd",
    "xp_award", "badge_grant",
])
```

### Complete Setup (Including Admin & Emergency)
```rust
subscribe_to_all_events()
```

## Event Data Structures

### Simple Events (Single Value)
- `init`: `u32` (version)
- `escrow_dep`: `i128` (amount)
- `escrow_wd`: `i128` (amount)
- `xp_award`: `u32` (xp amount)
- `badge_grant`: `Symbol` (badge name)
- `pause_cancel`: `u64` (timestamp)

### Address Events
- `admin_upd`: `Address` (new admin)
- `proof_sub`: `Address` (submitter)
- `approved`: `Address` (submitter)
- `rejected`: `Address` (submitter)
- `sub_paid`: `Address` (submitter)
- `escrow_pay`: `Address` (recipient)

### Complex Events (Structs)
- `quest_reg`: `Quest` struct
- `status_upd`: `Quest` struct
- `quest_full`: `Quest` struct
- `quest_exp`: `Quest` struct
- `auto_exp`: `Quest` struct
- `quest_can`: `Quest` struct

### Tuple Events
- `pause_init`: `(u32, u64)` (required_signatures, grace_period)
- `pause_cfg`: `(u64, u32, u64)` (timelock, signatures, grace)
- `migrate`: `(u32, u32)` (old_version, new_version)
- `rollback`: `(u32, u32)` (old_version, target_version)

### Custom Struct Events
- `pause.state_changed`: `PauseEvent { is_paused, reason, timestamp }`
- `pause.contract_resumed`: `UnpauseEvent { timestamp }`
- `emergency.withdrawal`: `EmergencyWithdrawalEvent { user, amount, quest_id, timestamp }`

## Testing Checklist

- [ ] Event is emitted at correct time
- [ ] Event topics are correct
- [ ] Event data is correct
- [ ] Event is emitted only once per action
- [ ] Event ordering is correct
- [ ] Event can be filtered by topic
- [ ] Event data can be deserialized

## Common Issues & Solutions

### Issue: Event not appearing in indexer
**Solution:** Check topic structure matches exactly, including Symbol creation

### Issue: Event data cannot be deserialized
**Solution:** Ensure data type matches what indexer expects (struct vs tuple vs simple type)

### Issue: Multiple events for single action
**Solution:** Check for duplicate event emission in nested function calls

### Issue: Event ordering incorrect
**Solution:** Ensure events are emitted after state changes are committed

## Performance Considerations

- Events are lightweight and don't significantly impact gas costs
- Event data is stored off-chain, not in contract storage
- Large structs in events (like `Quest`) are acceptable
- Consider event frequency when designing indexer polling intervals

## Version Compatibility

- All events are backward compatible
- New events added in v1.1 (this implementation)
- Indexers should handle unknown events gracefully
- Event structure changes require version bump

## Related Documentation

- Full event reference: `EVENT_REFERENCE.md`
- Implementation details: `EVENT_IMPLEMENTATION_SUMMARY.md`
- Audit report: `EVENT_AUDIT_REPORT.md`
- Test suite: `tests/test_events.rs`
