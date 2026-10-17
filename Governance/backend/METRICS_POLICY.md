# Backend Observability & Metrics Policy

This document establishes the official governance policy for telemetry, metrics collection, and dashboard standardization across backend services in **Stellar Earn (`EarnQuestOne/stellar_Earn`)**.

---

## 1. Required Metric Categories

Every backend service and microservice must expose standard application metrics covering the core RED (Requests, Errors, Duration) and USE (Utilization, Saturation, Errors) frameworks:

### HTTP / API Metrics
- `http_requests_total` (Counter): Total HTTP request count labeled by `method`, `route`, and `status_code`.
- `http_request_duration_seconds` (Histogram): Request latency buckets in seconds labeled by `method` and `route`.
- `http_active_requests` (Gauge): Current count of in-flight HTTP requests.

### Database & System Metrics
- `db_connection_pool_active` (Gauge): Active open database connections.
- `db_connection_pool_idle` (Gauge): Idle available database connections.
- `db_query_duration_seconds` (Histogram): Database query execution duration labeled by `operation` and `table`.

### Blockchain / Soroban Integration Metrics
- `stellar_rpc_request_duration_seconds` (Histogram): Stellar / Soroban RPC call latencies labeled by `method`.
- `stellar_transaction_submission_total` (Counter): Submitted transaction counts labeled by `status` (`success`, `failed`, `timeout`).

---

## 2. Metric & Dashboard Naming Conventions

To maintain uniformity across Grafana, Prometheus, and CloudWatch dashboards, all metrics and dashboard panels must follow these conventions:

- **Metric Naming**: Lowercase Snake Case (`[namespace]_[subsystem]_[name]_[unit]`).
  - *Example*: `stellarearn_auth_login_attempts_total`
- **Units**: Standard SI units (`seconds` for duration, `bytes` for payload sizes, `total` for counters).
- **Dashboard Titles**: `[Environment] - [Service Name] - [Dashboard Focus]`
  - *Example*: `[Production] - Backend API - Request Throughput & Latency`

---

## 3. Log Redaction & Security Limits in Telemetry

- **No Sensitive Data**: Telemetry labels and metric tags must **never** contain sensitive PII, JWT tokens, private keys, passwords, or raw user email addresses.
- **Cardinally Control**: Avoid high-cardinality label values (e.g., dynamic user IDs, IP addresses, or full path UUIDs) in metric labels to prevent Prometheus TSDB memory explosion.

---

## 4. Governance, Ownership & Cadence

- **Document Ownership**: Maintained by the DevOps / Infrastructure Lead and Backend System Architect.
- **Review & Update Cadence**: Reviewed and updated **semi-annually (twice a year)** or whenever major changes are introduced to the observability and telemetry pipeline.