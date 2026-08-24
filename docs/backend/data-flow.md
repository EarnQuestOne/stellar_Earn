# Data Flow &amp; Diagrams
 
How a unit of work moves through the StellarEarn backend. All diagrams are [Mermaid](https://mermaid.js.org/) and render on GitHub as-is.
 
---
 
## 1. System context
 
Where the backend sits between the client, its datastores, and external services.
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
flowchart LR
    FE["Frontend (Next.js)"]
 
    subgraph API["Backend (NestJS)"]
        direction TB
        GW["WebSocket gateway"]
        REST["REST / OpenAPI"]
        BUS(["Event bus (EventEmitter2)"])
        WORK["Job workers (BullMQ)"]
    end
 
    PG[("PostgreSQL")]
    RD[("Redis")]
    STELLAR["Stellar / Horizon"]
    SG["SendGrid"]
    GH["GitHub / partner webhooks"]
 
    FE -->|"HTTPS /api/v1"| REST
    FE <-->|"WebSocket"| GW
    GH -->|"signed webhook"| REST
 
    REST --> BUS
    BUS --> WORK
    REST --> PG
    WORK --> PG
    REST --> RD
    WORK --> STELLAR
    WORK --> SG
    GW --> RD
```
 
---
 
## 2. Request pipeline
 
Every HTTP request passes through the same cross-cutting layers before it reaches a controller, and through the filter chain on the way out. These are configured globally at bootstrap.
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
flowchart TB
    REQ["Incoming request"] --> SEC["Security middleware · Helmet · CORS · body limits"]
    SEC --> VER["Version resolver (path or X-API-Version)"]
    VER --> GUARD["Guards · JwtAuthGuard → RolesGuard"]
    GUARD --> PIPE["Pipe chain · Sanitization → CustomValidation → class-validator"]
    PIPE --> CTRL["Controller → Service"]
    CTRL --> OK["Success response"]
    CTRL -. throws .-> FILT["Filter chain · Sentry → Security → Validation → App → Logger"]
    GUARD -. 401 / 403 .-> FILT
    PIPE -. 400 .-> FILT
    FILT --> ERR["Normalized error response"]
 
    CTRL -.-> TRACE["TraceInterceptor + OpenTelemetry span"]
```
 
---
 
## 3. Quest lifecycle
 
The happy path from quest creation to a settled, on-chain reward. Note that submission creation and approval are driven by the **verification** path, and payout is reached through an **event**, not a direct call.
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
sequenceDiagram
    autonumber
    actor Admin
    actor Contributor
    participant Quests
    participant Webhooks
    participant Submissions
    participant Bus as Event bus
    participant Payouts
    participant Stellar
    participant Notif as Notifications
 
    Admin->>Quests: POST /quests (ADMIN)
    Quests-->>Bus: quest.created
    Bus-->>Notif: notify subscribers
 
    Contributor->>Contributor: do the work (e.g. merge PR)
    Note over Webhooks: GitHub / partner fires a signed webhook
    Webhooks->>Webhooks: verifyWebhookSignature()
    Webhooks->>Submissions: record / verify submission
    Submissions-->>Bus: submission.approved
 
    Bus-->>Payouts: on submission.approved
    Payouts->>Payouts: createPayout()
    Payouts->>Stellar: executeStellarPayment()
    Stellar-->>Payouts: tx hash + ledger
    Payouts->>Stellar: confirmSettlementFinality() (poll Horizon)
    Payouts-->>Bus: payout.settled
    Bus-->>Notif: notify contributor
    Notif-->>Contributor: WebSocket push + email
```
 
### Failure &amp; retry
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
flowchart LR
    A["Webhook received"] -->|bad signature| AR["Reject · retryFailedWebhook (≤3)"]
    B["executeStellarPayment"] -->|error| BR["emit payout.failed"]
    BR --> BRR["admin/:id/retry"]
    C["Settlement pending"] -->|"not final"| CR["confirmPendingSettlements (scheduled)"]
    CR --> C
```
 
---
 
## 4. Event-driven backbone
 
Modules stay decoupled by talking through the event bus (`@nestjs/event-emitter`) instead of importing each other — this is what broke the original circular dependencies (see `BackEnd/docs/CIRCULAR_DEPENDENCIES.md`). Emitters and listeners below reflect the modules that actually use the bus.
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
flowchart TB
    subgraph Emitters
        Q[Quests]
        W[Webhooks]
        U[Users]
        P[Payouts]
        S[Stellar]
    end
 
    BUS(["Event bus (EventEmitter2)"])
 
    subgraph Listeners
        N[Notifications]
        J["Jobs (BullMQ)"]
        A[Analytics]
        P2[Payouts]
        S2[Stellar]
    end
 
    Q --> BUS
    W --> BUS
    U --> BUS
    P --> BUS
    S --> BUS
 
    BUS --> N
    BUS --> J
    BUS --> A
    BUS --> P2
    BUS --> S2
```
 
Representative flows on the bus: `quest.*` → Notifications/Analytics · `submission.approved` → Payouts · `payout.failed` → alerting/retry · user data-export request → Jobs queue (keeps the request thread free).
 
---
 
## 5. Trace correlation
 
Because work crosses module boundaries asynchronously, the Trace module lets you reassemble one logical operation from its parts. A trace can be fetched by id, by the Stellar **transaction hash**, or by the **webhook event** that started it.
 
```mermaid
%%{init: {'theme':'base','themeVariables':{'background':'#ffffff','primaryColor':'#ffffff','primaryTextColor':'#000000','primaryBorderColor':'#000000','lineColor':'#000000','textColor':'#000000','secondaryColor':'#ffffff','secondaryTextColor':'#000000','secondaryBorderColor':'#000000','tertiaryColor':'#ffffff','tertiaryTextColor':'#000000','tertiaryBorderColor':'#000000','mainBkg':'#ffffff','nodeBorder':'#000000','nodeTextColor':'#000000','clusterBkg':'#ffffff','clusterBorder':'#000000','titleColor':'#000000','edgeLabelBackground':'#ffffff','actorBkg':'#ffffff','actorBorder':'#000000','actorTextColor':'#000000','actorLineColor':'#000000','signalColor':'#000000','signalTextColor':'#000000','labelBoxBkgColor':'#ffffff','labelBoxBorderColor':'#000000','labelTextColor':'#000000','loopTextColor':'#000000','noteBkgColor':'#ffffff','noteTextColor':'#000000','noteBorderColor':'#000000','sequenceNumberColor':'#ffffff'}}}%%
flowchart LR
    WH["Webhook event id"] --> T["Execution trace"]
    SVC["Service spans"] --> T
    TX["Stellar tx hash"] --> T
    T --> Q1["GET /traces/:traceId"]
    T --> Q2["GET /traces/by-tx/:txHash"]
    T --> Q3["GET /traces/by-webhook/:webhookEventId"]
```
 
This pairs with OpenTelemetry: the global `TraceInterceptor` opens a span per request, and the Trace endpoints expose the stored correlation for debugging the verification → payout pipeline.
 
---
 
## Keeping these diagrams honest
 
- Endpoint paths and module relationships here are derived from the controllers and services in `BackEnd/src/modules`. When routes change, update [the module reference](./module-apis.md) and any affected diagram in the same PR.
- For exact payloads and the complete current route list, the running Swagger UI at `/api/docs` is authoritative.
 