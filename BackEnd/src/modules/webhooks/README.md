# Webhooks Module Documentation

## Overview

The Webhooks module provides automated verification capabilities through GitHub webhooks, API endpoints, and other external services. It enables automated proof verification without manual admin intervention.

## Features

- ✅ GitHub webhook handler (push, pull_request, issues events)
- ✅ Generic API verification webhook handler
- ✅ Webhook signature verification for security
- ✅ Event processing pipeline with logging
- ✅ Automatic approval on valid webhooks
- ✅ Secure webhook secret management
- ✅ Retry handling for transient failures
- ✅ Comprehensive test coverage

## Endpoints

### GitHub Webhooks
```
POST /webhooks/github
```
Handles GitHub events with signature verification.

**Headers:**
- `X-GitHub-Event`: Event type (push, pull_request, issues)
- `X-GitHub-Delivery`: Unique delivery ID
- `X-Hub-Signature-256`: HMAC SHA256 signature

**Environment Variable:**
```
GITHUB_WEBHOOK_SECRET=your_github_secret_here
```

### API Verification Webhooks
```
POST /webhooks/api-verify
```
Handles custom verification events from external services.

**Headers:**
- `X-Event-Type`: Event type (submission_verify, auto_approve, external_validation)
- `X-Webhook-ID`: Unique webhook ID
- `Authorization`: Bearer token with HMAC SHA256 signature

**Environment Variable:**
```
API_WEBHOOK_SECRET=your_api_secret_here
```

### Health Check
```
POST /webhooks/health
```
Returns service health status.

## Webhook Event Types

### GitHub Events
- **push**: Repository push events
- **pull_request**: Pull request events (opened, closed, merged)
- **issues**: Issue events (opened, closed)

### API Events
- **submission_verify**: Submission verification requests
- **auto_approve**: Automatic approval triggers
- **external_validation**: External service validation results

## Security

### Signature Verification
All webhooks are verified using HMAC SHA256 signatures:

**GitHub Format:**
```
sha256=hex_encoded_signature
```

**API Format:**
```
hmac-sha256=hex_encoded_signature
```

### Secret Management
Store secrets in environment variables:
- `GITHUB_WEBHOOK_SECRET`
- `API_WEBHOOK_SECRET`

## Response Format

```json
{
  "success": true,
  "eventId": "unique-event-id",
  "message": "Webhook processed successfully",
  "processedAt": "2024-01-01T00:00:00.000Z",
  "data": {
    "status": "processed",
    "eventType": "push",
    "approved": true
  }
}
```

## Testing

Run the webhook tests:
```bash
npm run test:e2e -- test/webhooks/webhooks.e2e-spec.ts
```

## Implementation Details

### File Structure
```
src/modules/webhooks/
├── webhooks.module.ts          # Main module
├── webhooks.service.ts         # Core service logic
├── webhooks.controller.ts      # HTTP endpoints
├── handlers/
│   ├── github.handler.ts       # GitHub event handler
│   └── api.handler.ts          # API event handler
└── utils/
    └── signature.ts            # Signature verification utilities
```

### Retry Logic
The service includes built-in retry handling for transient failures with exponential backoff.

### Logging
All webhook events are logged with appropriate log levels:
- INFO: Successful processing
- WARN: Invalid signatures, unsupported events
- ERROR: Processing failures

## Example Usage

### GitHub Push Event
```bash
curl -X POST http://localhost:3000/webhooks/github \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: test-id" \
  -H "X-Hub-Signature-256: sha256=generated_signature" \
  -d '{"ref":"refs/heads/main","repository":{"full_name":"user/repo"}}'
```

### API Verification
```bash
curl -X POST http://localhost:3000/webhooks/api-verify \
  -H "X-Event-Type: submission_verify" \
  -H "X-Webhook-ID: test-id" \
  -H "Authorization: Bearer generated_signature" \
  -d '{"submissionId":"sub_123","userId":"user_456"}'
```

## Error Handling

Common error responses:
- `400 Bad Request`: Missing required headers
- `401 Unauthorized`: Invalid signature
- `500 Internal Server Error`: Processing failures

## Future Enhancements

- Database persistence for webhook events
- Webhook event queue for better scalability
- Rate limiting for abuse prevention
- More external service integrations
- Webhook dashboard for monitoring