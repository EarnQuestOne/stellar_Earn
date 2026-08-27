# Module API Reference
 
One entry per backend module under `BackEnd/src/modules`. Each entry lists the module's **responsibility**, its **HTTP surface** (base path + representative routes + auth), and how it participates in the **event-driven** flow.
 
Conventions from the [section index](./README.md) apply: all paths are under `/api/<version>`, JWT is bearer-token, roles are `ADMIN`/`MODERATOR`/`VERIFIER`/`USER`. Routes marked **public** require no token. For exact request/response schemas, use the live Swagger UI at `/api/docs`.
 
Legend: 🔓 public · 🔒 JWT required · 🛡️ role-restricted · 📡 emits/consumes domain events.
 
---
 
## Core domain
 
### Quests — `quests` 🛡️📡
Create and manage quests (the unit of work contributors complete). Lifecycle changes are broadcast as domain events for other modules to react to.
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/quests` | 🛡️ ADMIN |
| `GET` | `/quests` | 🔓 |
| `GET` | `/quests/:id` | 🔓 |
| `PATCH` | `/quests/:id` | 🛡️ ADMIN |
| `DELETE` | `/quests/:id` | 🛡️ ADMIN |
 
Reads are open so the frontend can browse the quest board unauthenticated; mutations are admin-only. Emits quest lifecycle events consumed by Notifications, Analytics, and the Stellar/Payout path.
 
### Submissions — `quests/:questId/submissions` 🔒📡
Proof-of-work submissions, scoped under a quest. Submission creation and approval are primarily driven by the verification path (see [Webhooks](#webhooks--webhooks-) and the [data flow](./data-flow.md)), with this controller exposing the read surface.
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/quests/:questId/submissions` | 🔒 |
 
Approval of a submission is the trigger that ultimately releases a payout, via an emitted event rather than a direct call.
 
### Payouts — `payouts` 🔒🛡️📡
On-chain reward settlement on Stellar. Contributor-facing claim/history endpoints plus an admin surface for creation, retries, and oversight.
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/payouts/claim` | 🔒 |
| `GET` | `/payouts/history` | 🔒 |
| `GET` | `/payouts/stats` | 🔒 |
| `GET` | `/payouts/:id` | 🔒 |
| `POST` | `/payouts/admin/create` | 🛡️ ADMIN |
| `GET` | `/payouts/admin/all` | 🛡️ ADMIN |
| `GET` | `/payouts/admin/stats` | 🛡️ ADMIN |
| `POST` | `/payouts/admin/:id/retry` | 🛡️ ADMIN |
| `GET` | `/payouts/admin/:id` | 🛡️ ADMIN |
 
Internally: `createPayout` → `processPayout` → `executeStellarPayment` (Stellar SDK), then `confirmSettlementFinality` polls the Horizon ledger before marking a payout settled. Emits failure events (e.g. payout-failed) for retry/alerting.
 
### Users — `users` 🔒📡
User profiles, reputation/XP, and account data. Participates in event-driven flows such as data export (offloaded to the Jobs queue via events).
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/users` | 🔒 |
 
> Additional user routes exist; consult Swagger for the full set.
 
---
 
## Identity & access
 
### Auth — `auth` 🔓
Credential and OAuth login; issues JWTs used everywhere else. (Google and GitHub OAuth strategies plus JWT/Passport are wired in this module.)
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/auth/login` | 🔓 |
 
### Two-Factor Auth — `auth/2fa` 🔒
TOTP-based 2FA (otplib + QR enrolment) layered on an authenticated session.
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/auth/2fa/status` | 🔒 |
| `POST` | `/auth/2fa/setup` | 🔒 |
| `POST` | `/auth/2fa/verify` | 🔒 |
| `DELETE` | `/auth/2fa/disable` | 🔒 |
 
---
 
## Verification & integrations
 
### Webhooks — `webhooks` 🔓📡
Ingest off-chain signals that verify quest completion. Every payload is signature-verified (`verifyWebhookSignature`) before `processWebhook` runs; failures are retryable (`retryFailedWebhook`).
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/webhooks/github` | 🔓 (signed) |
| `POST` | `/webhooks/api-verify` | 🔓 (signed) |
| `POST` | `/webhooks/generic/:service` | 🔓 (signed) |
| `POST` | `/webhooks/health` | 🔓 |
 
"Public" here means no JWT — authenticity comes from the shared-secret signature, not a bearer token. This is the front door of the verification → submission → payout pipeline.
 
### Email — `email` 🔓🔒
Transactional email via SendGrid, plus inbound delivery webhooks and unsubscribe handling.
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/email/send` | 🔒 |
| `GET` | `/email/status/:messageId` | 🔒 |
| `GET` | `/email/stats` | 🔒 |
| `GET` | `/email/history` | 🔒 |
| `POST` | `/email/webhook/sendgrid` | 🔓 (signed) |
| `GET` `POST` | `/email/unsubscribe` | 🔓 |
| `POST` | `/email/resubscribe` | 🔓 |
 
### Notifications — `notifications` 🔒📡
User-facing notifications, delivered over REST and pushed live through the WebSocket gateway. Consumes domain events (quest, payout, moderation) to generate notifications.
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/notifications/unread-count` | 🔒 |
 
---
 
## Moderation & governance
 
### Moderation — `moderation` 🔒🛡️
Content scanning, a moderator dashboard, and an appeals workflow.
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/moderation/scan` | 🔒 |
| `GET` | `/moderation/dashboard/pending` | 🛡️ ADMIN, MODERATOR |
| `GET` | `/moderation/dashboard/stats` | 🛡️ ADMIN, MODERATOR |
| `POST` | `/moderation/dashboard/items/:id/action` | 🛡️ ADMIN, MODERATOR |
| `POST` | `/moderation/appeals` | 🔒 |
| `GET` | `/moderation/appeals/pending` | 🛡️ ADMIN, MODERATOR |
| `POST` | `/moderation/appeals/:id/resolve` | 🛡️ ADMIN, MODERATOR |
 
### Postmortems — `postmortems`
Incident postmortems with action items and a publish step (pairs with the runbooks under `docs/`).
 
| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/postmortems` | — |
| `GET` | `/postmortems` · `/postmortems/:id` · `/postmortems/incident/:incidentId` · `/postmortems/stats` · `/postmortems/:id/related` | — |
| `PUT` | `/postmortems/:id` | — |
| `POST` | `/postmortems/:id/action-items` · `/postmortems/:id/publish` | — |
| `PUT` | `/postmortems/:id/action-items/:actionItemId/complete` | — |
 
---
 
## Platform & operations
 
### Health — `health` 🔓
Kubernetes-style probes (`@nestjs/terminus`).
 
| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health/live` | Liveness |
| `GET` | `/health/ready` | Readiness |
| `GET` | `/health` | Aggregate |
| `GET` | `/health/deep` | Dependency deep-check |
| `GET` | `/health/metrics` | Health metrics |
 
### Jobs — `jobs` 🔓📡
BullMQ queue observability. Background work (data exports, settlement confirmation, email) runs here, decoupled from request handlers via events.
 
| Method | Path |
| --- | --- |
| `GET` | `/jobs/health` · `/jobs` · `/jobs/metrics` · `/jobs/metrics/:queue` |
 
### Cache — `cache` 🔒
Redis cache administration and hit-rate visibility.
 
| Method | Path |
| --- | --- |
| `GET` | `/cache/stats` · `/cache/hit-rate` |
| `DELETE` | `/cache/clear` · `/cache/clear-pattern` · `/cache/reset-stats` |
 
### Feature Flags — `feature-flags` 🔓🔒
Runtime toggles. Reads are open; writes and audit are JWT-guarded.
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/feature-flags` · `/feature-flags/:id` · `/feature-flags/key/:key` · `/feature-flags/:key/check` | 🔓 |
| `POST` | `/feature-flags` | 🔒 |
| `PUT` | `/feature-flags/:id` | 🔒 |
| `DELETE` | `/feature-flags/:id` | 🔒 |
| `GET` | `/feature-flags/:id/audit` | 🔒 |
 
### Analytics — `analytics` 🛡️ / `analytics/web-vitals` 🔓
Platform/quest/user analytics, report generation & export, and on-demand aggregation — all ADMIN-gated. A separate public endpoint ingests frontend Web Vitals.
 
| Method | Path | Auth |
| --- | --- | --- |
| `GET` | `/analytics/platform` · `/analytics/quests` · `/analytics/users` | 🛡️ ADMIN |
| `POST` `GET` | `/analytics/reports` (+ `/:id`, `/:id/export`) | 🛡️ ADMIN |
| `POST` | `/analytics/aggregation/batch` · `/aggregation/quest/:questId` · `/aggregation/user/:userId` | 🛡️ ADMIN |
| `GET` | `/analytics/realtime/platform` · `/trending/:metric` · `/dashboard/summary` | 🛡️ ADMIN |
| `POST` | `/analytics/web-vitals` | 🔓 |
 
### Query Monitoring — `admin/query-monitoring` 🛡️
Slow-query and DB statistics surface, behind an `AdminGuard`.
 
| Method | Path |
| --- | --- |
| `GET` | `/admin/query-monitoring/statistics` · `/metrics` · `/slow-queries` · `/health` · `/clear-metrics` |
 
### Trace — `traces` 📡
Execution-trace lookup for debugging the cross-module pipeline. Traces are correlatable by transaction hash and by originating webhook event — the glue that lets you follow one unit of work across modules.
 
| Method | Path |
| --- | --- |
| `GET` | `/traces` |
| `GET` | `/traces/:traceId` |
| `GET` | `/traces/by-tx/:txHash` |
| `GET` | `/traces/by-webhook/:webhookEventId` |
 
---
 
## Internal modules (no HTTP surface)
 
These have no controller; they expose services/guards/gateways consumed by other modules and the event bus.
 
| Module | Role |
| --- | --- |
| **Stellar** 📡 | Wraps the Stellar SDK / Horizon. Builds and submits payment transactions and confirms ledger finality on behalf of Payouts. Reacts to and emits settlement events. |
| **WebSocket** | Socket.io gateway that pushes live updates (notifications, status changes) to connected clients. |
| **Admin** | Shared admin primitives (e.g. `AdminGuard`) and cross-cutting admin services. |
 
> The set of modules wired into `AppModule` evolves; some modules are composed transitively. Build the running app and open `/api/docs` to see exactly which routes are live in a given build.
 