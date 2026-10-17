# Backend Request-Tracing and Correlation-ID Policy

## Overview
This document defines the official request-tracing and correlation-ID policy for **EarnQuestOne/stellar_Earn**. Proper request tracing ensures full observability across distributed backend services, asynchronous workers, and external API integrations.

---

## 1. Propagation Header Standard
- **Header Name**: `X-Correlation-ID` (fallback supported for `X-Request-ID`).
- **Generation**: If an incoming request does not include an `X-Correlation-ID` header, the API Gateway or edge middleware must generate a unique UUIDv4 immediately upon ingress.
- **Propagation**: Every outbound HTTP request, gRPC call, and background job payload dispatched downstream must include the active `X-Correlation-ID`.

---

## 2. Logging & Telemetry Integration
- **Structured Logs**: All log entries emitted during the lifecycle of a request must automatically bind the `correlationId` field to their JSON context.
- **Tracing Spans**: Distributed tracing tools (such as OpenTelemetry or Jaeger) must inherit the correlation ID as the root trace or transaction identifier.

---

## 3. Ownership & Review Cadence
- **Primary Owner**: Backend Engineering & DevOps Team.
- **Review Cadence**: Audited semi-annually to ensure alignment with evolving telemetry standards and microservice architectures.