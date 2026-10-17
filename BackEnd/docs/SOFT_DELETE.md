# Soft Delete Implementation

## Overview

This document outlines the implementation of soft deletes for the EarnQuestOne/stellar_Earn project. Soft deletes provide an audit trail by marking records as deleted instead of permanently removing them from the database.

## Implementation Details

### 1. Database Migration

**File**: `src/database/migrations/1777056872715-add_soft_deletes.ts`

The migration adds `deletedAt` columns to the following core tables:
- `users`
- `quests` 
- `submissions`
- `notifications`
- `payouts`
- `refresh_tokens`

Each table also gets a corresponding index on the `deletedAt` column for performance.

### 2. Entity Updates

All core entities have been updated with:

```typescript
@DeleteDateColumn()
deletedAt: Date;
```

**Updated Entities**:
- `User` (src/modules/users/entities/user.entity.ts)
- `Quest` (src/modules/quests/entities/quest.entity.ts) 
- `Submission` (src/modules/submissions/entities/submission.entity.ts)
- `Notification` (src/modules/notifications/entities/notification.entity.ts)
- `Payout` (src/modules/payouts/entities/payout.entity.ts)
- `RefreshToken` (src/modules/auth/entities/refresh-token.entity.ts)

### 3. Soft Delete Utility

**File**: `src/common/utils/soft-delete.util.ts`

A utility class `SoftDeleteUtil` provides methods for:
- `excludeDeleted()` - Filter out soft-deleted records
- `onlyDeleted()` - Show only soft-deleted records  
- `includeDeleted()` - Show all records
- `softDelete()` - Soft delete by ID
- `restore()` - Restore soft-deleted record
- `softDeleteBy()` - Soft delete by conditions
- `restoreBy()` - Restore by conditions

### 4. Service Updates

#### Users Service
- `deleteUser()` now uses `softDelete()` instead of `remove()`
- All find methods (`findByAddress`, `findByUsername`, `findById`) exclude soft-deleted records

#### Quests Service  
- `remove()` now uses `softDelete()` instead of `remove()`
- `findAll()` excludes soft-deleted quests with `WHERE deletedAt IS NULL`
- `findOne()` and `update()` exclude soft-deleted records

#### Submissions Service
- `approveSubmission()` and `rejectSubmission()` exclude soft-deleted submissions

## Usage Examples

### Basic Soft Delete

```typescript
// Soft delete a user
await this.usersRepository.softDelete(userId);

// Restore a user
await this.usersRepository.restore(userId);
```

### Querying with Soft Deletes

```typescript
// Find only non-deleted records (default)
const users = await this.usersRepository.find({
  withDeleted: false
});

// Find all records including deleted
const allUsers = await this.usersRepository.find({
  withDeleted: true
});

// Find only deleted records
const deletedUsers = await this.usersRepository.find({
  where: { deletedAt: Not(IsNull()) },
  withDeleted: true
});
```

### Using the Utility

```typescript
import { withSoftDelete } from '../common/utils/soft-delete.util';

// Exclude deleted records
const queryBuilder = this.usersRepository.createQueryBuilder('user');
const activeUsers = await withSoftDelete(queryBuilder)
  .excludeDeleted()
  .getMany();

// Only deleted records  
const deletedUsers = await withSoftDelete(queryBuilder)
  .onlyDeleted()
  .getMany();
```

## Migration Steps

1. **Run the migration**:
   ```bash
   npm run migration:run
   ```

2. **Update application code** - Already completed for core services

3. **Test the implementation** - See test file for examples

## Benefits

- **Audit Trail**: All deleted records are preserved with deletion timestamp
- **Data Recovery**: Accidentally deleted records can be restored
- **Compliance**: Meets data retention requirements
- **Analytics**: Can analyze deletion patterns and reasons

## Considerations

- **Storage**: Deleted records continue to occupy database space
- **Performance**: Queries need to account for deletedAt filter
- **Cleanup**: May need periodic cleanup of very old deleted records
- **Backups**: Backup size will include deleted records

## Testing

**File**: `src/common/utils/soft-delete.test.ts`

Comprehensive tests covering:
- Soft delete utility methods
- Integration with TypeORM repositories
- Query filtering behavior

## Future Enhancements

1. **Automatic Cleanup**: Job to permanently delete old soft-deleted records
2. **Audit Logging**: Track who performed the deletion
3. **Bulk Operations**: Soft delete by criteria
4. **Admin Interface**: UI to view/restore deleted records

## Acceptance Criteria Met

✅ **Add deletedAt column** - Added to all core tables with indexes
✅ **Add soft delete query builder** - Implemented SoftDeleteUtil class  
✅ **Update repositories** - All core services updated to use soft deletes
✅ **Soft deletes working** - Implementation ready for testing
