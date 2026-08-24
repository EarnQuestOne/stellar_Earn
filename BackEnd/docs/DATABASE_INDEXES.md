# Database Indexes Documentation

## Overview
This document provides comprehensive documentation for all database indexes in the Stellar Earn application. It includes the purpose, usage patterns, and maintenance guidelines for each index.

## Table of Contents
1. [User Table Indexes](#user-table-indexes)
2. [Quest Table Indexes](#quest-table-indexes)
3. [Payout Table Indexes](#payout-table-indexes)
4. [Notification Table Indexes](#notification-table-indexes)
5. [Submission Table Indexes](#submission-table-indexes)
6. [RefreshToken Table Indexes](#refreshtoken-table-indexes)
7. [TwoFactorAuth Table Indexes](#twofactorauth-table-indexes)
8. [EventStore Table Indexes](#eventstore-table-indexes)
9. [NotificationPreference Table Indexes](#notificationpreference-table-indexes)
10. [JobLog Table Indexes](#joblog-table-indexes)
11. [Index Maintenance](#index-maintenance)
12. [Performance Monitoring](#performance-monitoring)

---

## User Table Indexes

### IDX_USER_STELLAR_ADDRESS (Unique)
- **Column**: `stellarAddress`
- **Type**: UNIQUE B-tree
- **Purpose**: Primary user lookup by Stellar blockchain address
- **Usage**: Authentication, user profile queries
- **Created**: Initial schema migration
- **Cardinality**: High (one per user)

### IDX_USER_EMAIL
- **Column**: `email`
- **Type**: B-tree (partial - WHERE email IS NOT NULL)
- **Purpose**: User authentication via email
- **Usage**: Login, password reset, email verification
- **Created**: Performance indexes migration
- **Cardinality**: High (unique per user)

### IDX_USER_USERNAME
- **Column**: `username`
- **Type**: B-tree (partial - WHERE username IS NOT NULL)
- **Purpose**: Profile lookups, leaderboards, mentions
- **Usage**: User search, profile pages, social features
- **Created**: Performance indexes migration
- **Cardinality**: High (unique per user)

### IDX_USER_GOOGLE_ID
- **Column**: `googleId`
- **Type**: B-tree (partial - WHERE googleId IS NOT NULL)
- **Purpose**: OAuth authentication with Google
- **Usage**: Google login flow
- **Created**: Performance indexes migration
- **Cardinality**: Medium (only OAuth users)

### IDX_USER_GITHUB_ID
- **Column**: `githubId`
- **Type**: B-tree (partial - WHERE githubId IS NOT NULL)
- **Purpose**: OAuth authentication with GitHub
- **Usage**: GitHub login flow
- **Created**: Performance indexes migration
- **Cardinality**: Medium (only OAuth users)

### IDX_USER_LAST_ACTIVE_AT
- **Column**: `lastActiveAt`
- **Type**: B-tree (partial - WHERE lastActiveAt IS NOT NULL)
- **Purpose**: Activity tracking and engagement metrics
- **Usage**: Active user reports, engagement analytics
- **Created**: Performance indexes migration
- **Cardinality**: Medium (updated on activity)

### IDX_USER_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: User registration analytics and date range queries
- **Usage**: Growth reports, cohort analysis
- **Created**: Performance indexes migration
- **Cardinality**: High (timestamp per user)

### IDX_USER_ROLE_DELETED
- **Column**: `role`, `deletedAt`
- **Type**: Composite B-tree
- **Purpose**: Admin queries for active users by role
- **Usage**: Admin dashboard, role-based filtering
- **Created**: Performance indexes migration
- **Cardinality**: Low (few roles)

### IDX_USER_CREATED_DELETED
- **Column**: `createdAt`, `deletedAt`
- **Type**: Composite B-tree
- **Purpose**: Analytics on active users over time
- **Usage**: Growth metrics, retention analysis
- **Created**: Performance indexes migration
- **Cardinality**: High

---

## Quest Table Indexes

### IDX_QUEST_STATUS
- **Column**: `status`
- **Type**: B-tree
- **Purpose**: Filter quests by status (ACTIVE, COMPLETED, etc.)
- **Usage**: Quest listing, status-based queries
- **Created**: Performance indexes migration
- **Cardinality**: Low (few statuses)

### IDX_QUEST_CREATED_BY
- **Column**: `createdBy`
- **Type**: B-tree
- **Purpose**: Creator's quest dashboard
- **Usage**: "My Quests" page, creator analytics
- **Created**: Performance indexes migration
- **Cardinality**: Medium (distributed across creators)

### IDX_QUEST_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: Quest sorting and analytics
- **Usage**: "Latest Quests", date range reports
- **Created**: Performance indexes migration
- **Cardinality**: High (timestamp per quest)

### IDX_QUEST_DEADLINE
- **Column**: `deadline`
- **Type**: B-tree (partial - WHERE deadline IS NOT NULL)
- **Purpose**: Expiring quest notifications and reminders
- **Usage**: Deadline alerts, expiring quest lists
- **Created**: Performance indexes migration
- **Cardinality**: High (varies per quest)

### IDX_QUEST_CONTRACT_TASK_ID (Unique)
- **Column**: `contractTaskId`
- **Type**: UNIQUE B-tree
- **Purpose**: Blockchain integration - map on-chain tasks to quests
- **Usage**: Smart contract synchronization
- **Created**: Performance indexes migration
- **Cardinality**: High (one per quest)

### IDX_QUEST_STATUS_DEADLINE
- **Column**: `status`, `deadline`
- **Type**: Composite B-tree (partial - WHERE deadline IS NOT NULL)
- **Purpose**: Active quests with upcoming deadlines
- **Usage**: Urgent quest notifications
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_QUEST_CREATOR_STATUS
- **Column**: `createdBy`, `status`
- **Type**: Composite B-tree
- **Purpose**: Creator's quests filtered by status
- **Usage**: Creator dashboard status tabs
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_QUEST_DELETED_AT
- **Column**: `deletedAt`
- **Type**: B-tree
- **Purpose**: Soft delete filtering
- **Usage**: Exclude deleted quests from queries
- **Created**: Performance indexes migration
- **Cardinality**: Low (mostly NULL)

### IDX_QUEST_CREATED_STATUS
- **Column**: `createdAt`, `status`
- **Type**: Composite B-tree
- **Purpose**: Quest analytics by date and status
- **Usage**: Quest creation trends, status distribution
- **Created**: Performance indexes migration
- **Cardinality**: High

---

## Payout Table Indexes

### IDX_PAYOUT_STELLAR_ADDRESS
- **Column**: `stellarAddress`
- **Type**: B-tree
- **Purpose**: User payout history - CRITICAL for UX
- **Usage**: "My Payouts" page, user earnings
- **Created**: Performance indexes migration
- **Cardinality**: Medium (distributed across users)
- **Priority**: HIGH

### IDX_PAYOUT_STATUS
- **Column**: `status`
- **Type**: B-tree
- **Purpose**: Payout processing and admin dashboard
- **Usage**: Pending payouts, failed payout retry
- **Created**: Performance indexes migration
- **Cardinality**: Low (few statuses)

### IDX_PAYOUT_TYPE
- **Column**: `type`
- **Type**: B-tree
- **Purpose**: Payout analytics by type
- **Usage**: Reward vs bonus vs referral analytics
- **Created**: Performance indexes migration
- **Cardinality**: Low (few types)

### IDX_PAYOUT_QUEST_ID
- **Column**: `questId`
- **Type**: B-tree (partial - WHERE questId IS NOT NULL)
- **Purpose**: Quest payout tracking
- **Usage**: Quest reward distribution reports
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_PAYOUT_SUBMISSION_ID
- **Column**: `submissionId`
- **Type**: B-tree (partial - WHERE submissionId IS NOT NULL)
- **Purpose**: Submission payout verification
- **Usage**: Link payouts to submissions
- **Created**: Performance indexes migration
- **Cardinality**: High (one per submission)

### IDX_PAYOUT_TRANSACTION_HASH
- **Column**: `transactionHash`
- **Type**: B-tree (partial - WHERE transactionHash IS NOT NULL)
- **Purpose**: Blockchain verification
- **Usage**: Transaction lookup, audit trail
- **Created**: Performance indexes migration
- **Cardinality**: High (one per completed payout)

### IDX_PAYOUT_NEXT_RETRY_AT
- **Column**: `nextRetryAt`
- **Type**: B-tree (partial - WHERE nextRetryAt IS NOT NULL)
- **Purpose**: Retry job scheduling
- **Usage**: Background job to retry failed payouts
- **Created**: Performance indexes migration
- **Cardinality**: Low (only failed payouts)

### IDX_PAYOUT_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: Payout history and analytics
- **Usage**: Date range reports, payout trends
- **Created**: Performance indexes migration
- **Cardinality**: High (timestamp per payout)

### IDX_PAYOUT_PROCESSED_AT
- **Column**: `processedAt`
- **Type**: B-tree (partial - WHERE processedAt IS NOT NULL)
- **Purpose**: Processing time analytics
- **Usage**: Performance metrics, SLA tracking
- **Created**: Performance indexes migration
- **Cardinality**: High

### IDX_PAYOUT_ADDRESS_STATUS
- **Column**: `stellarAddress`, `status`
- **Type**: Composite B-tree
- **Purpose**: User's pending payouts
- **Usage**: "Pending Payouts" section
- **Created**: Performance indexes migration
- **Cardinality**: Medium
- **Priority**: HIGH

### IDX_PAYOUT_STATUS_RETRY
- **Column**: `status`, `nextRetryAt`
- **Type**: Composite B-tree (partial - WHERE nextRetryAt IS NOT NULL)
- **Purpose**: Retry job processing
- **Usage**: Background job query optimization
- **Created**: Performance indexes migration
- **Cardinality**: Low

### IDX_PAYOUT_QUEST_STATUS
- **Column**: `questId`, `status`
- **Type**: Composite B-tree (partial - WHERE questId IS NOT NULL)
- **Purpose**: Quest payout tracking by status
- **Usage**: Quest completion analytics
- **Created**: Performance indexes migration
- **Cardinality**: Medium

---

## Notification Table Indexes

### IDX_NOTIFICATION_USER_ID
- **Column**: `userId`
- **Type**: B-tree
- **Purpose**: User's notifications
- **Usage**: Notification feed
- **Created**: Initial schema migration
- **Cardinality**: Medium

### IDX_NOTIFICATION_READ
- **Column**: `read`
- **Type**: B-tree
- **Purpose**: Unread notification filtering
- **Usage**: Unread count, notification badge
- **Created**: Initial schema migration
- **Cardinality**: Low (boolean)

### IDX_NOTIFICATION_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: Notification sorting
- **Usage**: "Latest Notifications" ordering
- **Created**: Performance indexes migration
- **Cardinality**: High

### IDX_NOTIFICATION_TYPE
- **Column**: `type`
- **Type**: B-tree
- **Purpose**: Filter by notification type
- **Usage**: Type-specific notification lists
- **Created**: Performance indexes migration
- **Cardinality**: Low (few types)

### IDX_NOTIFICATION_PRIORITY
- **Column**: `priority`
- **Type**: B-tree
- **Purpose**: Urgent notification filtering
- **Usage**: High-priority alerts
- **Created**: Performance indexes migration
- **Cardinality**: Low (few priorities)

### IDX_NOTIFICATION_USER_READ_CREATED
- **Column**: `userId`, `read`, `createdAt`
- **Type**: Composite B-tree
- **Purpose**: Unread notifications sorted by date
- **Usage**: Notification feed optimization
- **Created**: Performance indexes migration
- **Cardinality**: High
- **Priority**: HIGH

### IDX_NOTIFICATION_USER_TYPE
- **Column**: `userId`, `type`
- **Type**: Composite B-tree
- **Purpose**: User's notifications by type
- **Usage**: Type-filtered notification feeds
- **Created**: Performance indexes migration
- **Cardinality**: Medium

---

## Submission Table Indexes

### IDX_SUBMISSION_QUEST_ID
- **Column**: `questId`
- **Type**: B-tree
- **Purpose**: Quest submissions
- **Usage**: Quest submission list
- **Created**: Initial schema migration
- **Cardinality**: Medium

### IDX_SUBMISSION_USER_ID
- **Column**: `userId`
- **Type**: B-tree
- **Purpose**: User submissions
- **Usage**: User submission history
- **Created**: Initial schema migration
- **Cardinality**: Medium

### IDX_SUBMISSION_STATUS
- **Column**: `status`
- **Type**: B-tree
- **Purpose**: Submission status filtering
- **Usage**: Pending/approved/rejected lists
- **Created**: Initial schema migration
- **Cardinality**: Low (few statuses)

### IDX_SUBMISSION_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: Submission sorting and analytics
- **Usage**: Latest submissions, date range reports
- **Created**: Performance indexes migration
- **Cardinality**: High

### IDX_SUBMISSION_APPROVED_AT
- **Column**: `approvedAt`
- **Type**: B-tree (partial - WHERE approvedAt IS NOT NULL)
- **Purpose**: Approval time analytics
- **Usage**: Approval rate metrics
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_SUBMISSION_REJECTED_AT
- **Column**: `rejectedAt`
- **Type**: B-tree (partial - WHERE rejectedAt IS NOT NULL)
- **Purpose**: Rejection time analytics
- **Usage**: Rejection rate metrics
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_SUBMISSION_USER_STATUS_CREATED
- **Column**: `userId`, `status`, `createdAt`
- **Type**: Composite B-tree
- **Purpose**: User's submissions by status
- **Usage**: User submission dashboard
- **Created**: Performance indexes migration
- **Cardinality**: High
- **Priority**: HIGH

### IDX_SUBMISSION_QUEST_STATUS_CREATED
- **Column**: `questId`, `status`, `createdAt`
- **Type**: Composite B-tree
- **Purpose**: Quest submissions by status
- **Usage**: Quest management dashboard
- **Created**: Performance indexes migration
- **Cardinality**: High

### IDX_SUBMISSION_STATUS_CREATED
- **Column**: `status`, `createdAt`
- **Type**: Composite B-tree
- **Purpose**: Pending submissions queue
- **Usage**: Admin review queue
- **Created**: Performance indexes migration
- **Cardinality**: High

---

## RefreshToken Table Indexes

### IDX_REFRESH_TOKEN_TOKEN
- **Column**: `token` (now `tokenHash`)
- **Type**: B-tree
- **Purpose**: Token lookup for authentication
- **Usage**: Token validation
- **Created**: Initial schema migration
- **Cardinality**: High

### IDX_REFRESH_TOKEN_STELLAR_ADDRESS
- **Column**: `stellarAddress`
- **Type**: B-tree
- **Purpose**: User token lookup
- **Usage**: User session management
- **Created**: Initial schema migration
- **Cardinality**: Medium

### IDX_REFRESH_TOKEN_FAMILY_ID
- **Column**: `familyId`
- **Type**: B-tree
- **Purpose**: Token family tracking for rotation security
- **Usage**: Token rotation, reuse detection
- **Created**: Performance indexes migration
- **Cardinality**: Medium
- **Priority**: HIGH (security)

### IDX_REFRESH_TOKEN_IS_REVOKED
- **Column**: `isRevoked`
- **Type**: B-tree
- **Purpose**: Active token queries
- **Usage**: Filter out revoked tokens
- **Created**: Performance indexes migration
- **Cardinality**: Low (boolean)

### IDX_REFRESH_TOKEN_EXPIRES_AT
- **Column**: `expiresAt`
- **Type**: B-tree
- **Purpose**: Token cleanup jobs
- **Usage**: Background job to remove expired tokens
- **Created**: Performance indexes migration
- **Cardinality**: High

### IDX_REFRESH_TOKEN_USER_REVOKED_EXPIRES
- **Column**: `userId`, `isRevoked`, `expiresAt`
- **Type**: Composite B-tree (partial - WHERE userId IS NOT NULL)
- **Purpose**: User's active tokens
- **Usage**: Session management, logout all
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_REFRESH_TOKEN_FAMILY_REVOKED
- **Column**: `familyId`, `isRevoked`
- **Type**: Composite B-tree
- **Purpose**: Token family validation
- **Usage**: Reuse detection, family revocation
- **Created**: Performance indexes migration
- **Cardinality**: Medium
- **Priority**: HIGH (security)

---

## TwoFactorAuth Table Indexes

### IDX_TWO_FACTOR_STELLAR_ADDRESS (Unique)
- **Column**: `stellarAddress`
- **Type**: UNIQUE B-tree
- **Purpose**: 2FA configuration lookup
- **Usage**: 2FA setup, verification
- **Created**: Two-factor auth migration
- **Cardinality**: Medium (only 2FA users)

### IDX_TWO_FACTOR_ENABLED
- **Column**: `enabled`
- **Type**: B-tree
- **Purpose**: 2FA enabled users
- **Usage**: Security analytics, 2FA adoption metrics
- **Created**: Performance indexes migration
- **Cardinality**: Low (boolean)

---

## EventStore Table Indexes

### IDX_EVENT_STORE_EVENT_NAME
- **Column**: `eventName`
- **Type**: B-tree
- **Purpose**: Event type filtering
- **Usage**: Event history by type
- **Created**: Event store entity
- **Cardinality**: Low (few event types)

### IDX_EVENT_STORE_TIMESTAMP
- **Column**: `timestamp`
- **Type**: B-tree
- **Purpose**: Event chronological ordering
- **Usage**: Event timeline, date range queries
- **Created**: Event store entity
- **Cardinality**: High

### IDX_EVENT_STORE_NAME_TIMESTAMP
- **Column**: `eventName`, `timestamp`
- **Type**: Composite B-tree
- **Purpose**: Event history queries
- **Usage**: Event timeline by type
- **Created**: Performance indexes migration
- **Cardinality**: High

---

## NotificationPreference Table Indexes

### IDX_NOTIFICATION_PREF_USER_TYPE (Unique)
- **Column**: `userId`, `type`
- **Type**: UNIQUE constraint
- **Purpose**: User preference lookups
- **Usage**: Check user notification preferences
- **Created**: Notification preference entity
- **Cardinality**: Medium

### IDX_NOTIFICATION_PREF_ENABLED
- **Column**: `enabled`
- **Type**: B-tree
- **Purpose**: Enabled preferences
- **Usage**: Filter active preferences
- **Created**: Performance indexes migration
- **Cardinality**: Low (boolean)

### IDX_NOTIFICATION_PREF_USER_ENABLED
- **Column**: `userId`, `enabled`
- **Type**: Composite B-tree
- **Purpose**: User's enabled preferences
- **Usage**: Notification delivery logic
- **Created**: Performance indexes migration
- **Cardinality**: Medium

---

## JobLog Table Indexes

### IDX_JOB_LOGS_STATUS
- **Column**: `status`
- **Type**: B-tree
- **Purpose**: Job status filtering
- **Usage**: Failed job monitoring
- **Created**: Job log entity
- **Cardinality**: Low (few statuses)

### IDX_JOB_LOGS_JOB_TYPE
- **Column**: `jobType`
- **Type**: B-tree
- **Purpose**: Job type filtering
- **Usage**: Job type analytics
- **Created**: Job log entity
- **Cardinality**: Low (few job types)

### IDX_JOB_LOG_USER_ID
- **Column**: `userId`
- **Type**: B-tree (partial - WHERE userId IS NOT NULL)
- **Purpose**: User job tracking
- **Usage**: User-specific job history
- **Created**: Performance indexes migration
- **Cardinality**: Medium

### IDX_JOB_LOG_CREATED_AT
- **Column**: `createdAt`
- **Type**: B-tree
- **Purpose**: Job history queries
- **Usage**: Job timeline, date range reports
- **Created**: Performance indexes migration
- **Cardinality**: High

---

## Index Maintenance

### Regular Maintenance Tasks

#### 1. Index Statistics Update
```sql
-- Update statistics for query planner
ANALYZE users;
ANALYZE quests;
ANALYZE submissions;
ANALYZE payouts;
ANALYZE notifications;
```

#### 2. Index Bloat Check
```sql
-- Check for bloated indexes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS index_scans
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### 3. Unused Index Detection
```sql
-- Find unused indexes (idx_scan = 0)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

#### 4. Index Rebuild (if needed)
```sql
-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_name;

-- Or rebuild all indexes on a table
REINDEX TABLE CONCURRENTLY table_name;
```

### Monitoring Queries

#### Index Usage Statistics
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### Index Hit Rate
```sql
SELECT
  sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) AS index_hit_rate
FROM pg_statio_user_indexes;
```

#### Table and Index Sizes
```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Monitoring

### Query Performance Targets

| Query Type | Target Response Time | Index Used |
|------------|---------------------|------------|
| User authentication | < 50ms | IDX_USER_EMAIL, IDX_USER_STELLAR_ADDRESS |
| Quest listing | < 100ms | IDX_QUEST_STATUS, IDX_QUEST_CREATED_AT |
| Submission queries | < 100ms | IDX_SUBMISSION_USER_STATUS_CREATED |
| Payout history | < 150ms | IDX_PAYOUT_ADDRESS_STATUS |
| Notification feed | < 100ms | IDX_NOTIFICATION_USER_READ_CREATED |
| Analytics queries | < 500ms | Various date-based indexes |

### Slow Query Monitoring

Enable slow query logging in PostgreSQL:
```sql
-- Set slow query threshold to 100ms
ALTER DATABASE stellar_earn SET log_min_duration_statement = 100;

-- Enable query statistics
ALTER DATABASE stellar_earn SET track_activities = on;
ALTER DATABASE stellar_earn SET track_counts = on;
```

### Index Effectiveness Metrics

Monitor these metrics weekly:
1. **Index scan ratio**: Should be > 95% for critical indexes
2. **Index hit rate**: Should be > 99%
3. **Unused indexes**: Review and consider dropping
4. **Index bloat**: Rebuild if > 30% bloated
5. **Query response times**: Compare against targets

---

## Best Practices

1. **Always use indexes for**:
   - Foreign key columns
   - Columns in WHERE clauses
   - Columns in ORDER BY clauses
   - Columns in JOIN conditions
   - Columns with high cardinality

2. **Avoid indexes for**:
   - Small tables (< 1000 rows)
   - Columns with low cardinality (< 10 unique values)
   - Columns that are rarely queried
   - Columns that are frequently updated

3. **Composite index order**:
   - Most selective column first
   - Equality conditions before range conditions
   - Consider query patterns

4. **Partial indexes**:
   - Use WHERE clause for sparse data
   - Reduces index size
   - Improves write performance

5. **Regular maintenance**:
   - Update statistics weekly
   - Check for bloat monthly
   - Review unused indexes quarterly
   - Rebuild bloated indexes as needed

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 1769471764117 | Initial | Base indexes for core tables |
| 1777213481000 | 2026-04-26 | Performance indexes for all tables |

---

## References

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Index Maintenance Best Practices](https://www.postgresql.org/docs/current/routine-reindex.html)
- [Query Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
