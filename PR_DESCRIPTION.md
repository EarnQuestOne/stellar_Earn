## refactor(stellar): split StellarService (588 lines) into focused services

### Background

`src/modules/stellar/stellar.service.ts` was 588 lines and mixed multiple unrelated concerns — submission handling, multisig logic, event ingestion, and payment transfers — a maintainability smell. `SorobanQuestReaderService` already demonstrated the focused-service pattern; the rest of the module needed to align.

### Changes

**New focused services:**

| Service | Responsibility | Lines |
|---|---|---|
| `StellarSubmissionService` | Soroban contract calls: `approveSubmission`, `signAndSubmit`, `_signAndSubmitContract` | ~280 |
| `StellarPaymentService` | Native XLM/asset transfers via Horizon: `sendPayment` | ~80 |
| `StellarEventIngestionService` | Cron-based Soroban event ingestion with deduplication | ~230 |

**Slimmed `StellarService`** (now ~60 lines):
- Shared infrastructure provider — `getHorizon()`, `getRpc()`, `getNetworkPassphrase()`
- All three focused services inject `StellarService` for low-level SDK clients

**DI wiring (`stellar.module.ts`):**
- All 5 services registered and exported (including existing `SorobanQuestReaderService`)

**Consumer updates:**
- `SubmissionsService` → now injects `StellarSubmissionService` (was `StellarService`)
- `PayoutProcessor` → now injects `StellarPaymentService` (was `StellarService`)

**Test coverage:**

| Spec file | Tests | Status |
|---|---|---|
| `stellar.service.spec.ts` | 5 | ✅ Pass |
| `stellar-submission.service.spec.ts` | 6 | ✅ Pass |
| `stellar-payment.service.spec.ts` | 3 | ✅ Pass |
| `stellar-event-ingestion.service.spec.ts` | 4 | ✅ Pass |
| All affected e2e/integration tests | — | ✅ Updated |

### Files Changed (19 files)

- **New:** `stellar-submission.service.ts`, `stellar-submission.service.spec.ts`
- **New:** `stellar-payment.service.ts`, `stellar-payment.service.spec.ts`
- **New:** `stellar-event-ingestion.service.ts`, `stellar-event-ingestion.service.spec.ts`
- **Modified:** `stellar.service.ts`, `stellar.service.spec.ts`, `stellar.module.ts`, `CHANGELOG.md`
- **Modified:** `submissions.service.ts`, `submissions.service.spec.ts`
- **Modified:** `payout.processor.ts`
- **Modified:** `stellar-signing.spec.ts`, `stellar.integration-spec.ts`
- **Modified:** `verification.e2e-spec.ts`, `submissions-flow.e2e-spec.ts`
- **Modified:** `quests-submissions.integration-spec.ts`, `full-application.integration-spec.ts`

### Acceptance Criteria

- ✅ No single Stellar service file mixes unrelated concerns
- ✅ Existing behavior unchanged — all 19 stellar module tests pass
- ✅ Tests updated and passing
- ✅ Consumers updated to use focused services

Closes #1912
