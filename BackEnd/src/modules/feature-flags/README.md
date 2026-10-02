# Runtime Feature Flag Layer

A comprehensive runtime feature-flag system for progressive rollout of unstable modules with support for multiple rollout strategies, audit logging, and runtime evaluation.

## Overview

This feature flag system provides:

- **Database-backed persistence** - Flags are stored in PostgreSQL with full audit trail
- **Multiple rollout strategies** - Boolean, percentage-based, user whitelist/blacklist, segment-based
- **Runtime evaluation** - Flags are evaluated at runtime with caching for performance
- **Audit logging** - All flag changes are tracked with who, when, and why
- **Progressive rollout** - Gradually roll out features to minimize risk
- **NestJS integration** - Guards and decorators for easy use in controllers

## Rollout Strategies

### 1. Boolean (On/Off)

Simple on/off switch for features.

```typescript
{
  rolloutStrategy: 'BOOLEAN',
  enabled: true
}
```

### 2. Percentage Rollout

Gradually roll out to a percentage of users. Uses consistent hashing to ensure the same users always see the same state.

```typescript
{
  rolloutStrategy: 'PERCENTAGE',
  enabled: true,
  rolloutPercentage: 50  // 50% of users
}
```

### 3. User Whitelist

Only specific users can access the feature.

```typescript
{
  rolloutStrategy: 'USER_WHITELIST',
  enabled: true,
  whitelistedUsers: ['user-123', 'user-456']
}
```

### 4. User Blacklist

All users except specific ones can access the feature.

```typescript
{
  rolloutStrategy: 'USER_BLACKLIST',
  enabled: true,
  blacklistedUsers: ['user-789']
}
```

### 5. Segment-Based

Target users based on attributes like role, level, XP, or custom criteria.

```typescript
{
  rolloutStrategy: 'SEGMENT_BASED',
  enabled: true,
  segmentRules: {
    role: ['ADMIN', 'MODERATOR'],
    level: { min: 5, max: 10 },
    xp: { min: 1000 },
    custom: { betaTester: true }
  }
}
```

## Usage Examples

### Using the Service Directly

```typescript
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class MyService {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async myMethod(userId: string) {
    // Check if feature is enabled for user
    const isEnabled = await this.featureFlagsService.isEnabled(
      'NEW_DASHBOARD',
      userId,
      { role: 'USER', level: 5, xp: 1000 },
    );

    if (isEnabled) {
      // Use new feature
      return this.newDashboardLogic();
    } else {
      // Use old feature
      return this.oldDashboardLogic();
    }
  }
}
```

### Using the Guard in Controllers

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { FeatureFlag } from '../decorators/feature-flag.decorator';
import { FeatureFlagGuard } from '../guards/feature-flag.guard';

@Controller('api/v1')
export class MyController {
  @Get('new-endpoint')
  @FeatureFlag('NEW_ENDPOINT')
  @UseGuards(FeatureFlagGuard)
  async newEndpoint() {
    // This endpoint is only accessible if the NEW_ENDPOINT flag is enabled
    return { message: 'New feature is active!' };
  }
}
```

### Creating a Feature Flag via API

```bash
POST /feature-flags
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "key": "NEW_DASHBOARD",
  "name": "New Dashboard",
  "description": "The new dashboard UI with improved analytics",
  "rolloutStrategy": "PERCENTAGE",
  "status": "ACTIVE",
  "enabled": true,
  "rolloutPercentage": 10,
  "metadata": {
    "reason": "Initial 10% rollout for testing"
  }
}
```

### Updating a Feature Flag

```bash
PUT /feature-flags/{id}
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "rolloutPercentage": 50,
  "metadata": {
    "reason": "Increasing rollout to 50% after successful initial testing"
  }
}
```

### Checking a Flag Status

```bash
GET /feature-flags/NEW_DASHBOARD/check
```

Response:

```json
{
  "flagKey": "NEW_DASHBOARD",
  "enabled": true,
  "userId": "user-123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Getting Audit Logs

```bash
GET /feature-flags/{id}/audit
Authorization: Bearer <jwt-token>
```

Response:

```json
{
  "logs": [
    {
      "id": "audit-1",
      "flagId": "flag-1",
      "flagKey": "NEW_DASHBOARD",
      "action": "CREATED",
      "previousValue": null,
      "newValue": {/* flag data */},
      "performedBy": "user-123",
      "reason": "Initial creation",
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "audit-2",
      "flagId": "flag-1",
      "flagKey": "NEW_DASHBOARD",
      "action": "ROLLOUT_CHANGED",
      "previousValue": { "rolloutPercentage": 10 },
      "newValue": { "rolloutPercentage": 50 },
      "performedBy": "user-456",
      "reason": "Increasing rollout",
      "ipAddress": "192.168.1.2",
      "createdAt": "2024-01-16T14:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-16T15:00:00.000Z"
}
```

## API Endpoints

### Public Endpoints

- `GET /feature-flags` - Get all feature flags
- `GET /feature-flags/:id` - Get specific flag by ID
- `GET /feature-flags/key/:key` - Get specific flag by key
- `GET /feature-flags/:key/check` - Check if flag is enabled for current user

### Protected Endpoints (Requires Authentication)

- `POST /feature-flags` - Create new feature flag
- `PUT /feature-flags/:id` - Update feature flag
- `DELETE /feature-flags/:id` - Delete feature flag
- `GET /feature-flags/:id/audit` - Get audit logs for flag

## Best Practices

### 1. Progressive Rollout Strategy

Start with a small percentage and gradually increase:

1. Create flag with 5-10% rollout
2. Monitor metrics and error rates
3. Increase to 25% if stable
4. Increase to 50% if stable
5. Increase to 100% if stable
6. Remove flag once feature is fully rolled out

### 2. Use Descriptive Keys

Use clear, descriptive flag keys:

```typescript
// Good
'NEW_DASHBOARD_V2';
'ADVANCED_ANALYTICS';
'BETA_QUESTS';

// Bad
'FEATURE1';
'FLAG_A';
'TEST';
```

### 3. Document Flag Purpose

Always include a clear description:

```typescript
{
  "description": "New dashboard with improved analytics and real-time updates"
}
```

### 4. Use Audit Trail

Always provide a reason when changing flags:

```typescript
{
  "metadata": {
    "reason": "Rolling out to 50% after successful 25% test phase"
  }
}
```

### 5. Clean Up Old Flags

Remove flags that are no longer needed to avoid confusion:

```bash
DELETE /feature-flags/{id}
```

### 6. Test Before Rollout

Test new features with a small group before wider rollout:

```typescript
{
  "rolloutStrategy": "USER_WHITELIST",
  "whitelistedUsers": ['internal-tester-1', 'internal-tester-2']
}
```

## Database Schema

### feature_flags table

- `id` (UUID, primary key)
- `key` (VARCHAR, unique)
- `name` (VARCHAR)
- `description` (TEXT)
- `rolloutStrategy` (ENUM)
- `status` (ENUM)
- `enabled` (BOOLEAN)
- `rolloutPercentage` (INT)
- `whitelistedUsers` (TEXT[])
- `blacklistedUsers` (TEXT[])
- `segmentRules` (JSONB)
- `metadata` (JSONB)
- `createdBy` (VARCHAR)
- `updatedBy` (VARCHAR)
- `scheduledActivationAt` (TIMESTAMP)
- `scheduledDeactivationAt` (TIMESTAMP)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

### feature_flag_audit_logs table

- `id` (UUID, primary key)
- `flagId` (UUID)
- `flagKey` (VARCHAR)
- `action` (ENUM)
- `previousValue` (JSONB)
- `newValue` (JSONB)
- `performedBy` (VARCHAR)
- `reason` (TEXT)
- `ipAddress` (VARCHAR)
- `metadata` (JSONB)
- `createdAt` (TIMESTAMP)

## Caching

The service uses cache-manager to cache flag evaluation results for 5 minutes by default. This improves performance and reduces database load. Cache is automatically invalidated when flags are updated.

## Security

- All flag management endpoints require JWT authentication
- Audit logs track all changes with user ID, IP address, and timestamp
- Flag evaluation is performed server-side to prevent client-side manipulation

## Migration

Run the database migrations to create the required tables:

```bash
npm run migration:run
```

## Testing

Run unit tests:

```bash
npm test -- feature-flags.service.spec.ts
```

Run integration tests:

```bash
npm test -- feature-flags.controller.spec.ts
```

## Troubleshooting

### Flag Not Working

1. Check if flag is enabled and status is ACTIVE
2. Verify rollout strategy matches your use case
3. Check audit logs for recent changes
4. Clear cache if changes aren't reflected immediately

### Cache Issues

If flag changes aren't reflected immediately, the cache may need to be cleared. The service automatically invalidates cache on updates, but you can manually clear it if needed.

### Performance Issues

If experiencing performance issues with flag evaluation:

1. Check database query performance
2. Review cache hit rates
3. Consider reducing cache TTL for faster updates
4. Optimize segment rules to avoid complex evaluations
