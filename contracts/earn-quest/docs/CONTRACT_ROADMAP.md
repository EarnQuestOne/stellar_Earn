# EarnQuest Contract Roadmap

Linking security, performance, and reliability milestones for the `earn-quest` smart contract on Stellar/Soroban.

---

## Overview

This roadmap tracks planned improvements across three pillars:

- **Security** — protecting funds, authorization, and user data
- **Performance** — reducing resource consumption and transaction costs
- **Reliability** — ensuring correctness, recoverability, and observability

Each milestone references the relevant source modules in `src/`.

---

## Milestone 1 — Security Hardening

**Goal:** Eliminate remaining attack surfaces and strengthen authorization across all entry points.

| Task                                                 | Module                       | Status         |
| ---------------------------------------------------- | ---------------------------- | -------------- |
| Authorization checks on all state-changing functions | `security.rs`, `admin.rs`    | ✅ Done        |
| Duplicate claim prevention via status tracking       | `payout.rs`, `submission.rs` | ✅ Done        |
| Balance validation before every transfer             | `escrow.rs`, `payout.rs`     | ✅ Done        |
| Dispute participant validation                       | `dispute.rs`                 | ✅ Done        |
| Input bounds checking on all public functions        | `validation.rs`              | ✅ Done        |
| Oracle data freshness checks                         | `oracle.rs`                  | 🔄 In Progress |
| Fuzz testing for all entry points                    | `fuzz/`                      | 🔄 In Progress |
| Formal audit of `escrow.rs` and `payout.rs`          | —                            | 📋 Planned     |

**References:** `src/security.rs`, `src/validation.rs`, `src/admin.rs`

---

## Milestone 2 — Performance Optimization

**Goal:** Minimize ledger entry reads/writes and WASM binary size to reduce transaction fees.

| Task                                                 | Module                    | Status     |
| ---------------------------------------------------- | ------------------------- | ---------- |
| Split-storage model for escrow (hot/cold separation) | `escrow.rs`, `storage.rs` | ✅ Done    |
| Unified storage key system to avoid key collisions   | `unified_keys.rs`         | ✅ Done    |
| Indexed event topics for efficient off-chain queries | `events.rs`               | ✅ Done    |
| Lazy loading of cold escrow metadata                 | `storage.rs`              | 📋 Planned |
| Batch payout processing to reduce per-call overhead  | `payout.rs`               | 📋 Planned |
| WASM binary size audit and dead-code elimination     | —                         | 📋 Planned |
| Gas benchmarking across all public entry points      | `stats.rs`                | 📋 Planned |

**References:** `src/storage.rs`, `src/unified_keys.rs`, `src/stats.rs`

---

## Milestone 3 — Reliability & Observability

**Goal:** Ensure the contract behaves correctly under all conditions and failures are visible and recoverable.

| Task                                                 | Module                      | Status         |
| ---------------------------------------------------- | --------------------------- | -------------- |
| Comprehensive error types with clear failure reasons | `errors.rs`                 | ✅ Done        |
| Event emission for all state transitions             | `events.rs`                 | ✅ Done        |
| Dispute resolution with on-chain state tracking      | `dispute.rs`                | ✅ Done        |
| Appeal process with senior reviewer escalation       | `dispute.rs`                | ✅ Done        |
| Test snapshot system (174 snapshots)                 | `tests/`                    | ✅ Done        |
| Cross-contract interface tests                       | `tests/`                    | ✅ Done        |
| Reputation tracking for quest participants           | `reputation.rs`             | 🔄 In Progress |
| Automated migration validation on contract upgrade   | `init.rs`                   | 📋 Planned     |
| On-chain stats dashboard for monitoring              | `stats.rs`, `test_stats.rs` | 📋 Planned     |

**References:** `src/errors.rs`, `src/events.rs`, `src/dispute.rs`, `src/reputation.rs`

---

## Milestone 4 — Production Readiness

**Goal:** Full testnet and mainnet deployment with integration testing and frontend connectivity.

| Task                                         | Status     |
| -------------------------------------------- | ---------- |
| Deploy to Stellar testnet                    | 📋 Planned |
| Integration testing with real Stellar tokens | 📋 Planned |
| Frontend integration with UI                 | 📋 Planned |
| Indexer setup for claim and dispute events   | 📋 Planned |
| Final security audit before mainnet          | 📋 Planned |
| Mainnet deployment                           | 📋 Planned |

---

## Legend

| Symbol         | Meaning                        |
| -------------- | ------------------------------ |
| ✅ Done        | Implemented and tested         |
| 🔄 In Progress | Currently being worked on      |
| 📋 Planned     | Scheduled for a future release |

---

## Related Documents

- [DISPUTE_RESOLUTION.md](./DISPUTE_RESOLUTION.md)
- [APPEAL_PROCESS.md](./APPEAL_PROCESS.md)
- [EVENT_SPECIFICATION.md](./EVENT_SPECIFICATION.md)
- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md)
- [BOUNDS_CHECKING_GUIDE.md](../BOUNDS_CHECKING_GUIDE.md)

---

_Issue: [SC-080] Build a contract roadmap linking security, performance, and reliability milestones_
