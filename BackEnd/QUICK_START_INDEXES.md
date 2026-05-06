# Quick Start: Database Index Implementation

## TL;DR
Run these commands to implement database performance indexes:

```bash
# 1. Review the summary
cat DATABASE_INDEX_SUMMARY.md

# 2. Run the migration
npm run migration:run

# 3. Verify indexes
npm run verify:indexes
```

Expected result: **60-90% improvement** in query performance.

---

## What This Does

Adds 63 indexes to improve query performance, particularly:
- ✅ User queries by address (PRIMARY ISSUE)
- ✅ User authentication by email
- ✅ Quest listing and filtering
- ✅ Payout history queries
- ✅ Submission tracking
- ✅ Notification feeds

---

## Quick Commands

### Run Migration
```bash
npm run migration:run
```

### Verify Indexes
```bash
npm run verify:indexes
```

### Rollback (if needed)
```bash
npm run migration:revert
```

### Check Performance
```sql
-- Test user query by address
EXPLAIN ANALYZE 
SELECT * FROM users WHERE stellarAddress = 'GXXX...';

-- Test user query by email
EXPLAIN ANALYZE 
SELECT * FROM users WHERE email = 'test@example.com';

-- Test quest listing
EXPLAIN ANALYZE 
SELECT * FROM quests WHERE status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 20;

-- Test payout history
EXPLAIN ANALYZE 
SELECT * FROM payouts WHERE stellarAddress = 'GXXX...' ORDER BY createdAt DESC;
```

---

## Files to Review

1. **DATABASE_INDEX_SUMMARY.md** - Overview and results
2. **DATABASE_INDEX_IMPLEMENTATION.md** - Detailed implementation guide
3. **DATABASE_INDEX_ANALYSIS.md** - Technical analysis
4. **DATABASE_INDEXES_DOCUMENTATION.md** - Complete index reference

---

## Key Indexes Added

### High Priority (User-Facing)
- `IDX_PAYOUT_STELLAR_ADDRESS` - Payout history
- `IDX_USER_EMAIL` - Authentication
- `IDX_QUEST_STATUS` - Quest listing
- `IDX_NOTIFICATION_USER_READ_CREATED` - Notification feed
- `IDX_SUBMISSION_USER_STATUS_CREATED` - User submissions

### Security
- `IDX_REFRESH_TOKEN_FAMILY_ID` - Token rotation
- `IDX_REFRESH_TOKEN_FAMILY_REVOKED` - Token security

### Performance
- Multiple composite indexes for complex queries
- Partial indexes for sparse data
- Date-based indexes for analytics

---

## Expected Performance

| Query | Before | After | Improvement |
|-------|--------|-------|-------------|
| User by email | 200-500ms | 20-50ms | **75-90%** |
| Quest listing | 300-800ms | 50-100ms | **80-90%** |
| Payout history | 400-1000ms | 50-150ms | **85-90%** |

---

## Troubleshooting

### Migration fails?
```bash
# Check database connection
npm run typeorm -- query "SELECT 1"

# Check existing indexes
npm run typeorm -- query "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'"
```

### Indexes not being used?
```sql
-- Update statistics
ANALYZE;

-- Check query plan
EXPLAIN ANALYZE your_query_here;
```

### Need to rollback?
```bash
npm run migration:revert
npm run verify:indexes
```

---

## Production Deployment

1. **Backup first!**
   ```bash
   pg_dump stellar_earn > backup_$(date +%Y%m%d).sql
   ```

2. **Run during low-traffic period**

3. **Monitor after deployment**
   ```bash
   npm run verify:indexes
   ```

4. **Check application logs** for errors

---

## Success Criteria

✅ All indexes created (run `npm run verify:indexes`)
✅ No migration errors
✅ Query performance improved
✅ No increase in application errors
✅ Database CPU < 10% increase

---

## Need Help?

1. Check `DATABASE_INDEX_IMPLEMENTATION.md` troubleshooting section
2. Run verification script: `npm run verify:indexes`
3. Review database logs
4. Check query plans with `EXPLAIN ANALYZE`

---

## Summary

- **63 indexes** added across 10 tables
- **Primary focus**: User queries by address
- **Expected improvement**: 60-90% faster queries
- **Safe**: Includes rollback procedure
- **Documented**: 4 comprehensive guides included

**Ready to deploy!** 🚀
