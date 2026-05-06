# TODO Tracking

Audit of all TODO comments in the codebase. Each item has a corresponding GitHub issue.

Closes #297

## Backend

| File | Line | TODO | Issue |
|------|------|------|-------|
| `BackEnd/src/modules/analytics/services/report.service.ts` | 146 | Delete associated file if it exists | #433 |
| `BackEnd/src/modules/analytics/services/report.service.ts` | 315 | Implement payout analytics report generation | #433 |
| `BackEnd/src/modules/analytics/services/report.service.ts` | 320 | Implement revenue tracking report generation | #433 |
| `BackEnd/src/modules/analytics/services/report.service.ts` | 325 | Implement retention analysis report generation | #433 |
| `BackEnd/src/modules/analytics/services/report.service.ts` | 330 | Implement geographic distribution report generation | #433 |
| `BackEnd/src/modules/jobs/processors/cleanup.processor.ts` | 41 | Query and delete expired sessions | #435 |
| `BackEnd/src/modules/jobs/processors/cleanup.processor.ts` | 97 | Query and delete old logs | #435 |
| `BackEnd/src/modules/jobs/processors/cleanup.processor.ts` | 154 | Execute database maintenance | #435 |
| `BackEnd/src/modules/jobs/processors/webhook.processor.ts` | 46 | Send HTTP POST request to webhook URL | #436 |
| `BackEnd/src/modules/jobs/processors/webhook.processor.ts` | 115 | Load webhook log entry and re-attempt delivery | #436 |
| `BackEnd/src/modules/jobs/processors/quest.processor.ts` | 35 | Check quest deadlines | #437 |
| `BackEnd/src/modules/jobs/processors/quest.processor.ts` | 116 | Verify quest completion | #437 |
| `BackEnd/src/modules/jobs/processors/email.processor.ts` | 39 | Integrate with email service (SendGrid, AWS SES, etc.) | #438 |
| `BackEnd/src/modules/jobs/processors/email.processor.ts` | 98 | Generate digest content based on type | #438 |
| `BackEnd/src/modules/jobs/processors/export.processor.ts` | 51 | Integrate with data service | #439 |
| `BackEnd/src/modules/jobs/processors/export.processor.ts` | 175 | Generate report based on type | #439 |
| `BackEnd/test/submissions/verification.e2e-spec.ts` | 22 | Full E2E Integration Tests | #440 |
| `BackEnd/test/submissions/verification.e2e-spec.ts` | 394 | Integration Tests (Requires Testnet Credentials) | #440 |
| `BackEnd/src/modules/jobs/jobs.controller.ts` | 252 | Remove job from queue if it hasn't started processing | #441 |
| `BackEnd/src/modules/jobs/processors/analytics.processor.ts` | 212 | Collect system and application metrics | #442 |
| `BackEnd/src/modules/jobs/processors/payout.processor.ts` | 46 | Integrate with Stellar SDK to execute transaction | #443 |

## Frontend

| File | Line | TODO | Issue |
|------|------|------|-------|
| `FrontEnd/my-app/lib/api/profile.ts` | 127 | Replace with actual API call | #434 |
| `FrontEnd/my-app/lib/api/profile.ts` | 155 | Replace with actual API call | #434 |
| `FrontEnd/my-app/lib/api/profile.ts` | 179 | Replace with actual API call | #434 |
| `FrontEnd/my-app/lib/api/profile.ts` | 195 | Replace with actual API call | #434 |
| `FrontEnd/my-app/lib/api/profile.ts` | 211 | Replace with actual API call | #434 |
| `FrontEnd/my-app/lib/hooks/useReputation.ts` | 31 | Replace with actual API call | #444 |
| `FrontEnd/my-app/components/submission/SubmissionDetail.tsx` | 223 | Implement claim reward functionality | #445 |
