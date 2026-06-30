# EarnQuest Contract SLA / SLO

This document defines the service expectations for user-visible contract operations on Stellar/Soroban. It is intentionally operational: it describes what success looks like, how it is measured, and when the team should treat behavior as degraded.

## Scope

These targets apply to production contract operations initiated through the supported platform flow:

- quest registration
- proof submission
- submission approval
- reward claim
- escrow deposit or top-up
- quest cancellation / expiry refund flows
- read-only contract queries used by the application

These targets do not apply to:

- local development environments
- maintenance windows announced in advance
- testnet experimentation
- failures caused by user-supplied invalid input or insufficient user balance
- third-party wallet signature delays outside platform control

## Definitions

### SLA

The external commitment the platform aims to honor for production contract-backed operations. If the platform later adopts customer-facing commercial terms, update this section to match that agreement.

### SLO

The internal reliability target used to drive engineering and operations decisions before the SLA is at risk.

### Success

A contract operation counts as successful when all of the following are true:

- the request is accepted by the platform
- any required signature or authorization step completes
- the contract invocation reaches a terminal success state
- the user-visible status is updated in platform systems within the defined completion window

### Latency Window

Latency is measured from the time the platform accepts an operation request to the time the operation reaches a user-visible terminal state:

- `success` for writes
- `response returned` for read-only queries

## Service Levels

| Operation Class | SLA Target | SLO Target | Latency Window |
|---|---|---|---|
| Contract write operations | 99.5% successful completion per rolling 30 days | 99.9% successful completion per rolling 30 days | 95% within 2 minutes, 99% within 5 minutes |
| Contract read operations | 99.9% successful responses per rolling 30 days | 99.95% successful responses per rolling 30 days | 95% within 1.5 seconds, 99% within 3 seconds |
| Critical payout path (`approve_submission`, `claim_reward`, escrow-affecting refunds) | 99.7% successful completion per rolling 30 days | 99.95% successful completion per rolling 30 days | 95% within 90 seconds, 99% within 4 minutes |

## Operation-Specific Expectations

| Contract Operation | Success SLO | Latency SLO |
|---|---|---|
| `register_quest` / `register_quest_with_metadata` / `register_quests_batch` | 99.9% over 30 days | 95% complete within 2 minutes |
| `submit_proof` / `commit_submission` / `reveal_submission` | 99.9% over 30 days | 95% complete within 2 minutes |
| `approve_submission` / `approve_submissions_batch` | 99.95% over 30 days | 95% complete within 90 seconds |
| `claim_reward` | 99.95% over 30 days | 95% complete within 90 seconds |
| `deposit_escrow` / top-up flows | 99.9% over 30 days | 95% complete within 2 minutes |
| `cancel_quest` / `withdraw_unclaimed` / `expire_quest` | 99.9% over 30 days | 95% complete within 3 minutes |
| Query methods such as `get_quest`, `get_submission`, `get_escrow_info`, `get_platform_stats` | 99.95% over 30 days | 95% return within 1.5 seconds |

## Measurement Rules

### Included In Success-Rate Calculations

- successful mainnet invocations triggered by supported application flows
- retryable infrastructure failures that still surface to the user as failures inside the latency window
- backend-to-RPC failures that prevent a valid invocation from completing

### Excluded From Success-Rate Calculations

- requests rejected because of contract rules or caller mistakes
  - examples: unauthorized caller, duplicate quest id, invalid deadline, insufficient escrow, paused contract
- user-abandoned flows before signature or submission
- planned maintenance with prior communication
- upstream chain-wide incidents formally declared by Stellar/Soroban operators

### Latency Measurement Notes

- Write latency should include queueing, signing, submission, confirmation, and application status propagation.
- Read latency should include backend processing and upstream RPC time for queries that depend on contract state.
- Batch operations should be measured per request, not per item inside the batch.

## Error Budget Policy

The rolling 30-day SLO error budget is the difference between 100% and the target SLO.

| SLO Class | Error Budget |
|---|---|
| 99.95% | 0.05% |
| 99.9% | 0.1% |
| 99.7% | 0.3% |

When more than 50% of the monthly error budget is consumed:

- pause non-essential reliability risk
- review recent incidents and failure clusters
- prioritize operational fixes over feature work in the affected path

When more than 100% of the monthly error budget is consumed:

- treat the affected operation class as out of SLO
- open an incident review
- require mitigation or rollback planning before shipping further risky changes in that path

## Alerting Guidance

Recommended alert thresholds:

- page if critical payout-path success falls below 99.5% over 24 hours
- page if p95 write latency exceeds 5 minutes for 15 continuous minutes
- page if p95 payout-path latency exceeds 4 minutes for 15 continuous minutes
- ticket if read-query p95 exceeds 1.5 seconds for 60 continuous minutes
- ticket if any non-critical contract write success falls below 99.9% over 7 days

## Operational Response Expectations

### Severity Guidance

- `SEV-1`: reward claims or approval-to-payout flows broadly failing
- `SEV-2`: quest creation, proof submission, or escrow funding materially degraded
- `SEV-3`: read-heavy queries degraded while writes remain healthy

### Initial Response Targets

| Severity | Acknowledge | Mitigation Plan | Status Update Cadence |
|---|---|---|---|
| SEV-1 | 15 minutes | 30 minutes | Every 30 minutes |
| SEV-2 | 30 minutes | 60 minutes | Every 60 minutes |
| SEV-3 | 1 business day | 2 business days | Daily until stable |

## Instrumentation Expectations

To make these SLOs measurable, production monitoring should capture:

- contract method name
- request acceptance timestamp
- terminal outcome timestamp
- terminal status
- failure category
  - contract validation
  - authorization
  - RPC transport
  - confirmation timeout
  - platform propagation
- network
  - mainnet or testnet

If these fields are not yet emitted consistently, treat instrumentation work as a dependency for claiming SLO compliance.

## Gas Budget Constants

Gas budget targets are defined in `src/gas_budget.rs` and validated by `tests/gas_benchmarks.rs`.
Each constant is set to the observed CPU instruction ceiling plus a 20% safety margin.

### Benchmark Methodology

- Environment: Soroban SDK 21.7.4 test environment (`Env::default()`)
- Budget tracking: `env.budget().reset_default()` before each call; `cpu_instruction_cost()` delta measured after
- The Soroban simulation CPU cost model matches testnet gas metering exactly
- Multiple isolated test runs confirm the environment is deterministic (no variance)
- Margin applied to the observed peak: `budget = ceil(observed * 1.20)`

### Measurement Results (2026-06-26, soroban-sdk 21.7.4)

| Entrypoint | Symbol | Raw Baseline (CU) | Budget (+20%) |
| --- | --- | --- | --- |
| `initialize` | `init` | 284,753 | 341,704 |
| `register_quest` | `reg_qst` | 341,268 | 409,522 |
| `submit_proof` | `sub_prf` | 386,946 | 464,336 |
| `approve_submission` | `appr_sub` | 438,714 | 526,457 |
| `claim_reward` | `clm_rwd` | 767,838 | 921,406 |

### Re-benchmarking Procedure

Run the benchmark suite and pass `--nocapture` to see the measurement output:

```
cargo test -p earn_quest -- gas_benchmarks --nocapture
```

After any contract change that may affect instruction counts:

1. Run the benchmark suite and note the "Measured cost" lines in the output
2. Apply +20% margin and update `gas_budget::default_targets()` in `src/gas_budget.rs`
3. Update the measurement table above with the new values and date
4. Update `tests/gas_baselines.json` by running:
   `UPDATE_GAS_BASELINES=1 cargo test -p earn_quest test_gas_regression_check`

### Gas Budget CI Policy

- `tests/gas_benchmarks.rs` asserts each entrypoint stays within its budget constant
- `tests/test_gas_regression.rs` detects regressions against the pinned `tests/gas_baselines.json` baseline (max 5% increase allowed)
- A failing benchmark or regression test blocks merge until constants are recalibrated

## Change Management

Review this document when any of the following changes:

- supported contract write paths
- backend submission / retry architecture
- Stellar or Soroban confirmation behavior
- customer-facing commitments for payout timeliness
- monitoring or incident-management processes

At minimum, review quarterly.
