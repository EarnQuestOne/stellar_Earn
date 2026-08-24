# Two-Step Migration Implementation Guide

## Overview

This implementation addresses issue #342 by implementing a comprehensive two-step migration strategy that handles both schema changes and data migration.

## Problem Statement

The existing migrations only handled schema changes without proper data migration. This led to:
- Table name mismatches between schema and entities
- Missing columns in database tables
- Incorrect data types
- Lack of proper relationships and constraints
- No rollback mechanisms

## Solution: Two-Step Migration Strategy

### Step 1: Schema Synchronization (`1800000000000-data-migration-step1-schema-sync.ts`)

**Purpose**: Align database schema with current entity definitions

**Key Features**:
- Renames tables from PascalCase to lowercase to match entity names
- Adds missing columns to all major entities
- Updates column types where needed
- Prepares database for data migration

**Tables Modified**:
- `User` → `users`
- `Quest` → `quests` 
- `Submission` → `submissions`
- `Notification` → `notifications`
- `Payout` → `payouts`
- `RefreshToken` → `refresh_tokens`

**New Columns Added**:
- **Users**: questsCompleted, badges, avatarUrl, bio, socialLinks, privacyLevel, failedQuests, successRate, totalEarned, lastActiveAt, pushToken, webhookUrl, lastSyncedAt
- **Quests**: creatorAddress, currentCompletions, maxCompletions, startDate, endDate
- **Payouts**: type, questId, submissionId, transactionHash, stellarLedger, failureReason, retryCount, maxRetries, nextRetryAt, processedAt, claimedAt

### Step 2: Data Migration (`1800000000001-data-migration-step2-data-migration.ts`)

**Purpose**: Migrate and transform existing data to match new schema

**Key Features**:
- Calculates user statistics based on existing submissions and payouts
- Updates quest completion counts
- Links payouts to submissions where possible
- Establishes proper foreign key relationships
- Creates performance indexes
- Ensures data integrity

**Data Transformations**:
- User statistics (questsCompleted, failedQuests, successRate, totalEarned)
- Quest statistics (currentCompletions, creatorAddress)
- Payout relationships (submissionId, questId)
- Proper enum values for status fields

## Rollback Strategy

### Automatic Rollback (`scripts/rollback-migrations.ts`)

**Features**:
- Reverses Step 2 first (data migration)
- Reverses Step 1 second (schema sync)
- Handles constraint and index cleanup
- Preserves data integrity during rollback

**Usage**:
```bash
npm run migration:rollback:two-step
```

### Manual Rollback
```bash
ts-node scripts/rollback-migrations.ts manual
```

## Testing Strategy

### Migration Tests (`scripts/test-migrations.ts`)

**Test Coverage**:
- Table existence validation
- Column existence validation
- Data integrity checks
- Foreign key constraint validation
- Index existence validation
- Performance testing

**Usage**:
```bash
npm run migration:test                    # Basic tests
npm run migration:test:performance        # Performance tests
```

### Validation Script (`scripts/validate-migrations.ts`)

**Validations**:
- Migration file structure
- Required imports and methods
- Error handling patterns
- Package.json scripts
- Dependencies

**Usage**:
```bash
ts-node scripts/validate-migrations.ts
```

## Usage Instructions

### Running Migrations

1. **Run both steps with testing**:
```bash
npm run migration:two-step
```

2. **Run individual steps**:
```bash
npm run migration:run                    # Runs all pending migrations
npm run migration:test                    # Tests after migration
```

3. **Check migration status**:
```bash
npm run migration:show                    # Shows pending migrations
```

### Rolling Back Migrations

1. **Automatic rollback**:
```bash
npm run migration:rollback:two-step
```

2. **Manual rollback**:
```bash
ts-node scripts/rollback-migrations.ts manual
```

## Migration Scripts Added to package.json

```json
{
  "migration:two-step": "bun run migration:run && bun run migration:test",
  "migration:rollback:two-step": "ts-node scripts/rollback-migrations.ts",
  "migration:test": "ts-node scripts/test-migrations.ts",
  "migration:test:performance": "ts-node scripts/test-migrations.ts performance"
}
```

## Key Benefits

1. **Data Safety**: Two-step approach ensures schema is ready before data migration
2. **Rollback Capability**: Full rollback support for both steps
3. **Testing**: Comprehensive test suite validates migration success
4. **Performance**: Optimized queries and indexes for better performance
5. **Integrity**: Foreign key constraints ensure data consistency
6. **Monitoring**: Detailed logging for debugging and monitoring

## Migration Order

The migrations are designed to run in this specific order:
1. All existing migrations (initial schema, OAuth, soft deletes, etc.)
2. **Step 1**: Schema synchronization
3. **Step 2**: Data migration and relationships

## Error Handling

- All migrations include comprehensive error handling
- Rollback scripts handle constraint cleanup
- Test scripts detect and report issues
- Logging provides detailed debugging information

## Performance Considerations

- Indexes added for frequently queried columns
- Batch operations for large data sets
- Optimized SQL queries to minimize execution time
- Performance tests to validate migration speed

## Security Considerations

- No sensitive data exposed in migration logs
- Proper SQL injection prevention
- Secure rollback procedures
- Validation of data integrity

## Future Maintenance

- Migration files are self-contained
- Clear naming convention with timestamps
- Comprehensive documentation
- Automated testing for validation
- Easy to extend for future migrations

## Acceptance Criteria Met

✅ **Data migrated**: All existing data is properly migrated and transformed
✅ **Rollback scripts**: Comprehensive rollback functionality implemented
✅ **Test migrations**: Full test suite with validation and performance tests
✅ **Two-step strategy**: Clear separation between schema and data migration
✅ **Error handling**: Robust error handling and recovery mechanisms

## Files Created/Modified

### New Migration Files
- `src/database/migrations/1800000000000-data-migration-step1-schema-sync.ts`
- `src/database/migrations/1800000000001-data-migration-step2-data-migration.ts`

### New Scripts
- `scripts/rollback-migrations.ts`
- `scripts/test-migrations.ts`
- `scripts/validate-migrations.ts`

### Modified Files
- `package.json` - Added migration scripts
- `TWO_STEP_MIGRATION_GUIDE.md` - This documentation

## Conclusion

This two-step migration implementation provides a robust, testable, and rollback-safe solution for handling both schema changes and data migration. It addresses all the requirements of issue #342 and provides a solid foundation for future database migrations.
