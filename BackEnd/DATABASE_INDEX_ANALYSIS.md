# Database Index Analysis Report

## Executive Summary
This document analyzes the current database schema and identifies missing indexes that are causing slow query performance. The analysis is based on entity definitions and actual query patterns found in the codebase.

## Current Index Status

### Existing Indexes (from initial_schema migration)
1. **User Table**
   - `IDX_USER_STELLAR_ADDRESS` - UNIQUE index on `stellarAddress`

2. **Submission Table**
   - `IDX_SUBMISSION_QUEST_ID` - Index on `questId`
   - `IDX_SUBMISSION_USER_ID` - Index on `userId`
   - `IDX_SUBMISSION_STATUS` - Index on `status`

3. **Notification Table**
   - `IDX_NOTIFICATION_USER_ID` - Index on `userId`
   - `IDX_NOTIFICATION_READ` - Index on `read`

4. **RefreshToken Table**
   - `IDX_REFRESH_TOKEN_TOKEN` - Index on `token`
   - `IDX_REFRESH_TOKEN_STELLAR_ADDRESS` - Index on `stellarAddress`

5. **AnalyticsSnapshot Table**
   - `IDX_ANALYTICS_SNAPSHOT_DATE` - Index on `date`
   - `IDX_ANALYTICS_SNAPSHOT_TYPE` - Index on `type`
   - `IDX_ANALYTICS_SNAPSHOT_REFERENCE_ID` - Index on `referenceId`

## Missing Indexes - Critical Performance Issues

### 1. User Table (`users`)
**Issue**: Queries by `email`, `username`, `googleId`, `githubId`, and `lastActiveAt` are not indexed.

**Query Patterns Found**:
- Frequent lookups by `stellarAddress` (already indexed ✓)
- User authentication by `email` (NOT indexed ❌)
- Profile lookups by `username` (NOT indexed ❌)
- OAuth lookups by `googleId` and `githubId` (NOT indexed ❌)
- Activity tracking queries filtering by `lastActiveAt` (NOT indexed ❌)
- Date range queries on `createdAt` for analytics (NOT indexed ❌)

**Recommended Indexes**:
- `email` - UNIQUE index (authentication queries)
- `username` - Index (profile lookups, leaderboards)
- `googleId` - Index (OAuth authentication)
- `githubId` - Index (OAuth authentication)
- `lastActiveAt` - Index (activity tracking, engagement metrics)
- `createdAt` - Index (analytics, date range queries)
- Composite: `(role, deletedAt)` - Admin queries filtering active users by role

### 2. Quest Table (`quests`)
**Issue**: No indexes exist on this critical table.

**Query Patterns Found**:
- Filtering by `status` (ACTIVE, COMPLETED, etc.)
- Filtering by `createdBy` (creator's quests)
- Sorting by `createdAt`, `updatedAt`, `deadline`
- Date range queries for analytics
- Filtering by `deletedAt` for soft deletes

**Recommended Indexes**:
- `status` - Index (quest listing, filtering)
- `createdBy` - Index (creator's quest dashboard)
- `createdAt` - Index (sorting, analytics)
- `deadline` - Index (expiring quests, reminders)
- `contractTaskId` - UNIQUE index (blockchain integration)
- Composite: `(status, deadline)` - Active quests with upcoming deadlines
- Composite: `(createdBy, status)` - Creator's quests by status

### 3. Payout Table (`payouts`)
**Issue**: No indexes exist on this financial table with frequent queries.

**Query Patterns Found**:
- Filtering by `stellarAddress` (user's payout history)
- Filtering by `status` (PENDING, COMPLETED, FAILED)
- Filtering by `type` (QUEST_REWARD, BONUS, REFERRAL)
- Filtering by `questId` and `submissionId` (payout verification)
- Date queries on `createdAt`, `processedAt`, `nextRetryAt`
- Retry job queries filtering by `status` and `nextRetryAt`

**Recommended Indexes**:
- `stellarAddress` - Index (user payout history)
- `status` - Index (payout processing, admin dashboard)
- `type` - Index (payout analytics by type)
- `questId` - Index (quest payout tracking)
- `submissionId` - Index (submission payout verification)
- `transactionHash` - Index (blockchain verification)
- `nextRetryAt` - Index (retry job scheduling)
- Composite: `(stellarAddress, status)` - User's pending payouts
- Composite: `(status, nextRetryAt)` - Retry job processing
- Composite: `(questId, status)` - Quest payout tracking

### 4. Notification Table (`notifications`)
**Issue**: Missing indexes for common query patterns.

**Query Patterns Found**:
- Filtering by `userId` and `read` (already have separate indexes ✓)
- Sorting by `createdAt` (NOT indexed ❌)
- Filtering by `type` (NOT indexed ❌)
- Filtering by `priority` (NOT indexed ❌)

**Recommended Indexes**:
- `createdAt` - Index (sorting notifications)
- `type` - Index (filtering by notification type)
- `priority` - Index (urgent notifications)
- Composite: `(userId, read, createdAt)` - Unread notifications sorted by date
- Composite: `(userId, type)` - User's notifications by type

### 5. Submission Table (`submissions`)
**Issue**: Missing composite indexes for common query combinations.

**Query Patterns Found**:
- Existing indexes on `questId`, `userId`, `status` ✓
- Date range queries on `createdAt` (NOT indexed ❌)
- Queries combining `userId` and `status` (NOT optimized ❌)
- Queries combining `questId` and `status` (NOT optimized ❌)
- Sorting by `createdAt` and `updatedAt` (NOT indexed ❌)

**Recommended Indexes**:
- `createdAt` - Index (analytics, sorting)
- `approvedAt` - Index (approval time analytics)
- `rejectedAt` - Index (rejection time analytics)
- Composite: `(userId, status, createdAt)` - User's submissions by status
- Composite: `(questId, status, createdAt)` - Quest submissions by status
- Composite: `(status, createdAt)` - Pending submissions queue

### 6. RefreshToken Table (`refresh_tokens`)
**Issue**: Missing indexes for token rotation and family tracking.

**Query Patterns Found**:
- Existing indexes on `tokenHash`, `userId`, `stellarAddress` ✓
- Queries by `familyId` for token rotation (NOT indexed ❌)
- Queries filtering by `isRevoked` (NOT indexed ❌)
- Queries filtering by `expiresAt` for cleanup (NOT indexed ❌)

**Recommended Indexes**:
- `familyId` - Index (token family revocation)
- `isRevoked` - Index (active token queries)
- `expiresAt` - Index (token cleanup jobs)
- Composite: `(userId, isRevoked, expiresAt)` - User's active tokens
- Composite: `(familyId, isRevoked)` - Token family validation

### 7. TwoFactorAuth Table (`two_factor_auth`)
**Issue**: Only has unique index on `stellarAddress`.

**Query Patterns Found**:
- Lookup by `stellarAddress` (already indexed ✓)
- Filtering by `enabled` status (NOT indexed ❌)

**Recommended Indexes**:
- `enabled` - Index (2FA enabled users)
- Composite: `(stellarAddress, enabled)` - Already covered by unique index

### 8. EventStore Table (`event_store`)
**Issue**: Missing composite indexes for event querying.

**Query Patterns Found**:
- Existing indexes on `eventName` and `timestamp` ✓
- Queries combining `eventName` and `timestamp` (NOT optimized ❌)

**Recommended Indexes**:
- Composite: `(eventName, timestamp)` - Event history queries

### 9. NotificationPreference Table (`notification_preferences`)
**Issue**: Missing indexes for preference lookups.

**Query Patterns Found**:
- Queries by `userId` and `type` (NOT indexed ❌)
- Filtering by `enabled` (NOT indexed ❌)

**Recommended Indexes**:
- Composite: `(userId, type)` - User preference lookups (UNIQUE constraint exists)
- `enabled` - Index (enabled preferences)

### 10. Job Tables (`job_logs`, `job_log_retries`, `job_dependencies`, `job_schedules`)
**Issue**: Some indexes exist but missing key ones.

**Query Patterns Found**:
- Existing indexes on `status`, `jobType` ✓
- Queries filtering by `userId` (NOT indexed ❌)
- Date range queries on `createdAt` (NOT indexed ❌)

**Recommended Indexes**:
- `userId` - Index (user job tracking)
- `createdAt` - Index (job history queries)

## Performance Impact Estimation

### High Impact (Immediate Action Required)
1. **Payout.stellarAddress** - User payout queries are critical for UX
2. **Quest.status** - Quest listing is a primary feature
3. **User.email** - Authentication queries on every login
4. **RefreshToken.familyId** - Token rotation security feature
5. **Submission.createdAt** - Submission sorting and analytics

### Medium Impact (Should Be Added)
1. **Quest.createdBy** - Creator dashboard performance
2. **Notification.createdAt** - Notification feed sorting
3. **User.username** - Profile and leaderboard queries
4. **Payout.status** - Admin dashboard and processing jobs

### Low Impact (Nice to Have)
1. **User.lastActiveAt** - Activity tracking analytics
2. **Quest.deadline** - Expiring quest notifications
3. **EventStore composite** - Event history queries

## Composite Index Strategy

Composite indexes are recommended for queries that frequently filter and sort by multiple columns:

1. **User Activity**: `(userId, status, createdAt)` on submissions
2. **Quest Management**: `(createdBy, status)` on quests
3. **Payout Processing**: `(status, nextRetryAt)` on payouts
4. **Token Security**: `(familyId, isRevoked)` on refresh_tokens
5. **Notification Feed**: `(userId, read, createdAt)` on notifications

## Index Maintenance Considerations

1. **Index Size**: Each index adds storage overhead (~10-20% per index)
2. **Write Performance**: Indexes slow down INSERT/UPDATE operations slightly
3. **Maintenance**: Indexes need periodic REINDEX in PostgreSQL
4. **Monitoring**: Track index usage with `pg_stat_user_indexes`

## Recommendations

1. **Immediate**: Create indexes for high-impact columns
2. **Phase 2**: Add composite indexes for complex queries
3. **Monitor**: Use PostgreSQL's query analyzer to validate improvements
4. **Cleanup**: Remove unused indexes after monitoring period
5. **Document**: Update this document as query patterns evolve

## Query Performance Targets

- User authentication: < 50ms
- Quest listing: < 100ms
- Submission queries: < 100ms
- Payout history: < 150ms
- Analytics queries: < 500ms

## Next Steps

1. Create migration file with all recommended indexes
2. Test migration on staging environment
3. Monitor query performance before/after
4. Document index usage statistics
5. Schedule periodic index maintenance
