# Contract Test Scenarios

## Coverage Focus

- Quest lifecycle: creation, duplicate IDs, zero rewards, deadline handling, status transitions
- Submission lifecycle: pending, duplicate prevention, paused quest rejection, timestamp integrity
- Verification and payout: verifier authorization, replay protection, escrow sufficiency, total value invariants
- Reputation: XP accumulation, level progression, badge authorization, duplicate badge handling
- Emergency controls: pause initialization, multi-signature pause flow, timelock enforcement, emergency withdrawal window, unpause recovery
- Upgrade path: upgrade authorization, rollback, migration, version synchronization
- Property-style invariant testing: claim counter monotonicity, participant-cap invariants, reputation invariants
- Fuzz-style testing: deterministic randomized lifecycle checks across quest configurations
- Budget checks: approval flow CPU and memory sanity thresholds

## Recommended Commands

```bash
cargo test -- --nocapture
cargo test test_edge_cases -- --nocapture
cargo test test_security test_pause -- --nocapture
```

## Notes

- Soroban `Address` values are strongly typed, so malformed-address parsing is not a runtime contract concern in this codebase. Address-related coverage therefore focuses on role misuse and unauthorized callers.
- Budget checks use Soroban test metering to catch regressions in instruction and memory consumption. These are sanity bounds, not exact on-chain fee guarantees.