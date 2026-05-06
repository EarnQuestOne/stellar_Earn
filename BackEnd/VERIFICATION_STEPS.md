# Circular Dependency Resolution - Verification Steps

## Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- npm or bun
- PostgreSQL (if testing database features)

## Step 1: Install Dependencies

```bash
cd stellar_Earn/BackEnd
npm install
# or
bun install
```

## Step 2: Build the Project

This will check for TypeScript compilation errors and circular dependencies:

```bash
npm run build
```

**Expected Output:**
- ✅ Build completes successfully
- ✅ No "Circular dependency" warnings
- ✅ No TypeScript compilation errors

**If you see errors:**
- Check the error message for specific file/line numbers
- Verify all imports are correct
- Ensure all new files are properly created

## Step 3: Run Circular Dependency Check Script

```bash
npx ts-node scripts/check-circular-deps.ts
```

**Expected Output:**
```
[CircularDependencyChecker] Starting circular dependency check...
[CircularDependencyChecker] Checking app.module...
[CircularDependencyChecker] ✓ app.module - OK
[CircularDependencyChecker] Checking modules/auth/auth.module...
[CircularDependencyChecker] ✓ modules/auth/auth.module - OK
...
[CircularDependencyChecker] ✅ No circular dependencies detected!
```

## Step 4: Lint the Code

```bash
npm run lint
```

**Expected Output:**
- ✅ No linting errors
- ✅ Code follows project style guidelines

## Step 5: Run Unit Tests

```bash
npm run test
```

**Expected Output:**
- ✅ All existing tests pass
- ✅ No new test failures introduced

## Step 6: Start the Application

```bash
npm run start:dev
```

**Expected Output:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] EventsModule dependencies initialized
[Nest] INFO [InstanceLoader] UsersModule dependencies initialized
[Nest] INFO [InstanceLoader] JobsModule dependencies initialized
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [NestApplication] Nest application successfully started
```

**Watch for:**
- ✅ No "Circular dependency" warnings
- ✅ All modules initialize successfully
- ✅ Application starts without errors
- ✅ No DI (Dependency Injection) errors

## Step 7: Test Data Export Flow

### 7.1 Setup Test Environment

Ensure you have:
- Database running and migrated
- Valid JWT token for authentication
- User account created

### 7.2 Make Data Export Request

```bash
# Replace YOUR_TOKEN with a valid JWT token
curl -X POST http://localhost:3000/api/users/me/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exportType": "full",
    "format": "json"
  }'
```

**Expected Response:**
```json
{
  "id": "export-id-123",
  "userId": "user-id-456",
  "exportType": "full",
  "format": "json",
  "status": "PENDING",
  "createdAt": "2026-04-26T..."
}
```

### 7.3 Check Application Logs

Look for these log entries in order:

```
[DataExportService] Emitted data export request event for user user-id-456 id=export-id-123
[DataExportListener] [JobsModule] Data export requested for user user-id-456, exportId: export-id-123
[DataExportListener] Successfully queued export job for exportId: export-id-123
[DataExportProcessor] Processing data export job...
[DataExportProcessor] Data export completed: export-full-...json
```

**Verification:**
- ✅ Event is emitted by DataExportService
- ✅ Event is received by DataExportListener
- ✅ Job is queued successfully
- ✅ Job is processed by DataExportProcessor
- ✅ Completion event is emitted

## Step 8: Verify Module Dependencies

Run this command to visualize module dependencies:

```bash
# Check UsersModule doesn't import JobsModule
grep -r "JobsModule" src/modules/users/*.ts

# Should return: (no results)
```

```bash
# Check JobsModule has DataExportListener
grep -r "DataExportListener" src/modules/jobs/jobs.module.ts

# Should return: import and provider registration
```

```bash
# Check DataExportService uses EventEmitter2
grep -r "EventEmitter2" src/modules/users/data-export.service.ts

# Should return: import and constructor injection
```

## Step 9: Run Integration Tests (if available)

```bash
npm run test:integration
```

**Expected Output:**
- ✅ All integration tests pass
- ✅ Event flow works end-to-end

## Step 10: Check Event Store

If you have database access, verify events are being stored:

```sql
-- Check if events are being stored
SELECT * FROM event_store 
WHERE event_name LIKE 'user.data-export%' 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Expected Result:**
- Events are stored with correct event names
- Payload contains expected data
- Timestamps are correct

## Troubleshooting

### Issue: "Circular dependency detected"

**Solution:**
1. Check which modules are involved in the error message
2. Verify no direct imports between those modules
3. Ensure event-driven communication is used
4. Check for any remaining `forwardRef()` usage

### Issue: "Cannot find module"

**Solution:**
1. Verify all new files are created in correct locations
2. Check import paths are correct
3. Run `npm install` to ensure dependencies are installed
4. Clear build cache: `rm -rf dist && npm run build`

### Issue: "Event not being received"

**Solution:**
1. Verify EventsModule is imported in AppModule
2. Check event listener is registered in correct module
3. Verify event name matches exactly (case-sensitive)
4. Check EventEmitter2 is injected correctly
5. Look for errors in application logs

### Issue: "Job not being processed"

**Solution:**
1. Verify JobsModule is properly configured
2. Check BullMQ/Redis connection
3. Verify DataExportListener is registered
4. Check job queue name matches
5. Look for errors in job processor logs

## Success Criteria Checklist

- [ ] Build completes without errors
- [ ] No circular dependency warnings
- [ ] All modules load successfully
- [ ] Application starts without errors
- [ ] Data export request creates event
- [ ] Event is received by listener
- [ ] Job is queued successfully
- [ ] Job is processed correctly
- [ ] Completion event is emitted
- [ ] All tests pass
- [ ] No DI errors in logs
- [ ] Code follows project conventions

## Additional Verification

### Check Event Flow Diagram

```
User Request
    ↓
UsersController.requestExport()
    ↓
DataExportService.requestExport()
    ↓
EventEmitter.emit('user.data-export.requested')
    ↓
DataExportListener.handleDataExportRequested()
    ↓
JobsService.addJob(QUEUES.EXPORTS, ...)
    ↓
DataExportProcessor.processExport()
    ↓
EventEmitter.emit('user.data-export.completed')
```

### Verify No Direct Dependencies

```bash
# This should return NO results
grep -r "import.*JobsService.*from.*jobs" src/modules/users/

# This should return NO results  
grep -r "import.*JobsModule.*from.*jobs" src/modules/users/
```

## Performance Verification

### Check Event Processing Time

Monitor logs for event processing duration:

```
[DataExportListener] Successfully queued export job for exportId: export-id-123
# Time between emit and queue should be < 100ms
```

### Check Memory Usage

```bash
# Monitor memory during event processing
node --expose-gc --max-old-space-size=4096 dist/main.js
```

## Documentation Verification

- [ ] CIRCULAR_DEPENDENCY_RESOLUTION.md is complete
- [ ] CIRCULAR_DEPS_SUMMARY.md is accurate
- [ ] Code comments explain event flow
- [ ] Event DTOs are documented
- [ ] README updated (if needed)

## Final Sign-Off

Once all verification steps pass:

1. ✅ Circular dependencies resolved
2. ✅ Event-driven architecture implemented
3. ✅ All tests passing
4. ✅ Application runs successfully
5. ✅ Documentation complete

**Status:** Ready for code review and merge

---

**Date Completed:** _________________

**Verified By:** _________________

**Notes:** _________________
