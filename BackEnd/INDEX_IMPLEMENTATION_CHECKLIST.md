# Database Index Implementation Checklist

## Pre-Implementation Review

### Documentation Review
- [ ] Read `DATABASE_INDEX_SUMMARY.md` for overview
- [ ] Review `DATABASE_INDEX_ANALYSIS.md` for technical details
- [ ] Check `DATABASE_INDEX_IMPLEMENTATION.md` for procedures
- [ ] Understand `DATABASE_INDEXES_DOCUMENTATION.md` for reference

### Environment Preparation
- [ ] Verify database connection is working
- [ ] Check database user has CREATE INDEX permission
- [ ] Ensure sufficient disk space (indexes will add ~10-15% storage)
- [ ] Verify TypeORM is properly configured

## Development Environment Testing

### Step 1: Backup (Optional for Dev)
```bash
[ ] pg_dump -h localhost -U postgres -d stellar_earn_dev > backup_dev.sql
```

### Step 2: Run Migration
```bash
[ ] npm run migration:run
```

**Expected Output**:
```
query: SELECT * FROM "typeorm_migrations"
query: CREATE INDEX IF NOT EXISTS "IDX_USER_EMAIL" ON "users" ("email")...
Migration AddPerformanceIndexes1777213481000 has been executed successfully.
```

### Step 3: Verify Indexes
```bash
[ ] npm run verify:indexes
```

**Expected Output**:
```
✅ Found: 63 indexes
❌ Missing: 0 indexes
🎉 All expected indexes are present!
```

### Step 4: Test Application
```bash
[ ] npm run test
[ ] npm run test:e2e
```

### Step 5: Manual Testing
- [ ] Test user login (email authentication)
- [ ] Test quest listing page
- [ ] Test user payout history
- [ ] Test submission queries
- [ ] Test notification feed

### Step 6: Performance Testing
```sql
-- Run these queries and note execution times
[ ] EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
[ ] EXPLAIN ANALYZE SELECT * FROM quests WHERE status = 'ACTIVE' ORDER BY createdAt DESC LIMIT 20;
[ ] EXPLAIN ANALYZE SELECT * FROM payouts WHERE stellarAddress = 'GXXX...' ORDER BY createdAt DESC;
[ ] EXPLAIN ANALYZE SELECT * FROM submissions WHERE userId = 'xxx' AND status = 'PENDING' ORDER BY createdAt DESC;
```

**Record Results**:
- User by email: _____ ms (Target: < 50ms)
- Quest listing: _____ ms (Target: < 100ms)
- Payout history: _____ ms (Target: < 150ms)
- Submissions: _____ ms (Target: < 100ms)

### Step 7: Rollback Test
```bash
[ ] npm run migration:revert
[ ] npm run verify:indexes  # Should show missing indexes
[ ] npm run migration:run   # Re-apply migration
[ ] npm run verify:indexes  # Should show all indexes present
```

## Staging Environment Testing

### Pre-Deployment
- [ ] Notify team of staging deployment
- [ ] Schedule deployment window
- [ ] Prepare rollback plan

### Deployment
```bash
[ ] export NODE_ENV=staging
[ ] pg_dump stellar_earn_staging > backup_staging_$(date +%Y%m%d).sql
[ ] npm run migration:run 2>&1 | tee migration_staging.log
[ ] npm run verify:indexes
```

### Post-Deployment Testing
- [ ] Run full test suite
- [ ] Test all critical user flows
- [ ] Monitor application logs for errors
- [ ] Check database CPU and memory usage
- [ ] Validate query performance improvements

### Performance Validation
- [ ] Compare query times before/after
- [ ] Check index usage statistics
- [ ] Monitor slow query log
- [ ] Validate index hit rate > 95%

### Soak Testing
- [ ] Run load tests
- [ ] Monitor for 24 hours
- [ ] Check for any performance degradation
- [ ] Validate no increase in errors

## Production Deployment

### Pre-Deployment Checklist
- [ ] All staging tests passed
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled (low-traffic period)
- [ ] Rollback plan documented and tested
- [ ] Monitoring dashboards prepared
- [ ] On-call engineer assigned

### Backup
```bash
[ ] pg_dump -h $DB_HOST -U $DB_USER -d stellar_earn > backup_prod_$(date +%Y%m%d_%H%M%S).sql
[ ] Verify backup file size and integrity
[ ] Store backup in secure location
```

### Deployment
```bash
[ ] export NODE_ENV=production
[ ] npm run migration:run 2>&1 | tee migration_prod_$(date +%Y%m%d_%H%M%S).log
[ ] Check migration log for errors
```

### Immediate Verification
```bash
[ ] npm run verify:indexes
[ ] Check application logs for errors
[ ] Test critical user flows
[ ] Monitor error rates
```

### Performance Monitoring (First Hour)
- [ ] Monitor query response times
- [ ] Check database CPU usage
- [ ] Validate index hit rate
- [ ] Monitor application error rates
- [ ] Check slow query log
- [ ] Validate user-facing performance

### Performance Monitoring (First 24 Hours)
- [ ] Review query performance metrics
- [ ] Check index usage statistics
- [ ] Monitor database resource usage
- [ ] Validate no increase in errors
- [ ] Gather user feedback

### Performance Monitoring (First Week)
- [ ] Generate performance report
- [ ] Compare before/after metrics
- [ ] Document actual improvements
- [ ] Identify any issues
- [ ] Plan follow-up optimizations

## Post-Deployment Validation

### Index Usage Statistics
```sql
[ ] Run index usage query (see DATABASE_INDEXES_DOCUMENTATION.md)
[ ] Verify all indexes are being used
[ ] Check for unused indexes
[ ] Validate index hit rate > 95%
```

### Performance Metrics
- [ ] User authentication: _____ ms (Target: < 50ms)
- [ ] Quest listing: _____ ms (Target: < 100ms)
- [ ] Payout history: _____ ms (Target: < 150ms)
- [ ] Submission queries: _____ ms (Target: < 100ms)
- [ ] Notification feed: _____ ms (Target: < 100ms)

### Success Criteria Validation
- [ ] All expected indexes created
- [ ] No migration errors
- [ ] Query response times improved by 60%+
- [ ] No increase in application errors
- [ ] Database CPU increase < 10%
- [ ] Index hit rate > 95%
- [ ] All application tests pass
- [ ] User-facing performance improved

## Rollback Procedure (If Needed)

### Immediate Rollback
```bash
[ ] npm run migration:revert
[ ] npm run verify:indexes  # Confirm indexes removed
[ ] Check application functionality
[ ] Monitor error rates
[ ] Notify team of rollback
```

### Post-Rollback
- [ ] Document reason for rollback
- [ ] Analyze what went wrong
- [ ] Fix issues in migration
- [ ] Re-test in development
- [ ] Re-test in staging
- [ ] Plan new deployment

## Documentation Updates

### During Implementation
- [ ] Record actual deployment time
- [ ] Document any issues encountered
- [ ] Note actual performance improvements
- [ ] Update troubleshooting guide if needed

### After Implementation
- [ ] Update README with performance metrics
- [ ] Document lessons learned
- [ ] Share results with team
- [ ] Update monitoring dashboards
- [ ] Plan maintenance schedule

## Maintenance Schedule Setup

### Daily Monitoring
- [ ] Set up slow query log monitoring
- [ ] Configure query timeout alerts
- [ ] Monitor database CPU/memory

### Weekly Tasks
- [ ] Schedule index usage review
- [ ] Set up statistics update job: `ANALYZE;`
- [ ] Monitor index hit rate

### Monthly Tasks
- [ ] Schedule index bloat check
- [ ] Review unused indexes
- [ ] Validate performance targets

### Quarterly Tasks
- [ ] Schedule full index review
- [ ] Plan new indexes based on query patterns
- [ ] Remove unused indexes

## Sign-Off

### Development Environment
- [ ] Tested by: _________________ Date: _________
- [ ] Approved by: _______________ Date: _________

### Staging Environment
- [ ] Tested by: _________________ Date: _________
- [ ] Approved by: _______________ Date: _________

### Production Environment
- [ ] Deployed by: _______________ Date: _________
- [ ] Verified by: _______________ Date: _________
- [ ] Approved by: _______________ Date: _________

## Notes

### Issues Encountered
```
[Document any issues here]
```

### Performance Results
```
[Document actual performance improvements here]
```

### Lessons Learned
```
[Document lessons learned here]
```

### Follow-Up Actions
```
[Document any follow-up actions needed]
```

---

## Quick Reference

### Key Commands
```bash
# Run migration
npm run migration:run

# Verify indexes
npm run verify:indexes

# Rollback
npm run migration:revert

# Check performance
EXPLAIN ANALYZE your_query;
```

### Key Files
- `DATABASE_INDEX_SUMMARY.md` - Overview
- `DATABASE_INDEX_IMPLEMENTATION.md` - Detailed guide
- `DATABASE_INDEX_ANALYSIS.md` - Technical analysis
- `DATABASE_INDEXES_DOCUMENTATION.md` - Reference
- `QUICK_START_INDEXES.md` - Quick start guide

### Support
- Review troubleshooting section in implementation guide
- Run verification script
- Check database logs
- Review query plans

---

**Status**: ⏳ Ready for Implementation
**Last Updated**: 2026-04-26
