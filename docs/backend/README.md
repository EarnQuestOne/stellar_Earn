# Backend Documentation

Narrative reference for the StellarEarn backend (`BackEnd/`, NestJS 11 + TypeORM/Postgres).
 
This section complements — it does not replace — the **live, auto-generated OpenAPI docs**. When the API is running, the interactive Swagger UI is the source of truth for request/response **schemas**, query params, and status codes:
 
| Resource | URL (local) |
| --- | --- |
| Swagger UI | `http://localhost:3001/api/docs` |
| OpenAPI JSON | `http://localhost:3001/api/docs-json` |
| Health probe | `http://localhost:3001/api/v1/health` |
 
What lives **here** instead is the context Swagger can't express on its own: what each module is *for*, how the modules talk to each other, and how a unit of work flows through the system end to end.
 
## Contents
 
| Page | What it covers |
| --- | --- |
| [API Versioning Policy](./API_VERSIONING_POLICY.md) | SemVer rules for API consumers — version pinning, breaking vs non-breaking changes, deprecation headers, and migration. |
| [Module API Reference](./module-apis.md) | Every backend module — its responsibility, its HTTP surface (base path, key routes, auth), and the events it emits or consumes. |
| [Data Flow & Diagrams](./data-flow.md) | System context, the request pipeline, the quest → verification → payout lifecycle, the event-driven backbone, and trace correlation. Rendered as Mermaid. |
| [Type Ownership Guidelines](./type-ownership-guidelines.md) | How DTOs, domain models, and view models map across layers — defining type ownership and boundaries. |
| [Reliability Roadmap](./RELIABILITY_ROADMAP.md) | Milestones for green CI, test quality targets, and performance SLOs. |
 
## Platform-wide conventions
 
These apply to every module and are assumed (not repeated) on each page below.
 
- **Global prefix.** Every HTTP route is served under `/api`. Route base paths in the reference (e.g. `quests`) resolve to `/api/<version>/quests`.
- **Versioning.** Custom versioning is enabled (`v1` default). Pin a version by path (`/api/v1/...`) and/or the `X-API-Version` header. Responses include `X-API-Version`; deprecated versions also return `Deprecation`, `Sunset`, `Link`, and `Warning` headers. See the [API Versioning Policy](./API_VERSIONING_POLICY.md) for SemVer rules and consumer guidance.
- **Auth.** Bearer JWT (`Authorization: Bearer <token>`), issued by the Auth module. Protected routes use `JwtAuthGuard`; privileged routes add `RolesGuard` with `@Roles(...)`.
- **Roles.** `ADMIN`, `MODERATOR`, `VERIFIER`, `USER` (see `src/common/enums`).
- **Validation.** A global pipe chain runs on every request: sanitization → custom validation → `class-validator` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). Unknown properties are rejected.
- **Errors.** A global filter chain normalizes errors (Sentry → security → validation → app → logger). Stack traces are stripped from client responses in production.
- **Security middleware.** Helmet, CORS, body-size limits, and a custom `SecurityMiddleware` run ahead of the router.
- **Observability.** OpenTelemetry tracing is initialized at boot; a global `TraceInterceptor` tags requests, and traces are queryable through the Trace module (see below).
## How this section is meant to be read
 
Start with [Data Flow & Diagrams](./data-flow.md) for the mental model, then use the [Module API Reference](./module-apis.md) as a lookup. Diagrams are written in [Mermaid](https://mermaid.js.org/) so they render directly on GitHub and inside any docs-site generator (Docusaurus, MkDocs Material, VitePress) without a build step.
 
> **Scope note.** Route lists here are curated for orientation — the most useful and stable endpoints per module — not an exhaustive dump. Treat the running Swagger UI as authoritative for the complete, current list and for exact payloads.
 