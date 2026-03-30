# Job Queue System - Quick Reference Guide

## File Structure

```
src/modules/jobs/
├── job.types.ts                    # Job enums and type definitions
├── jobs.constants.ts               # Queue and config constants
├── jobs.service.ts                 # Core BullMQ queue service
├── jobs.controller.ts              # REST API endpoints
├── jobs.module.ts                  # Module configuration
├── entities/
│   └── job-log.entity.ts          # JobLog, JobLogRetry, JobDependency, JobSchedule entities
├── services/
│   ├── job-log.service.ts         # Job logging & querying
│   └── job-scheduler.service.ts   # Cron-based scheduling
├── processors/
│   ├── payout.processor.ts        # Payout processing
│   ├── email.processor.ts         # Email operations
│   ├── export.processor.ts        # Data export & reports
│   ├── cleanup.processor.ts       # Maintenance tasks
│   ├── webhook.processor.ts       # Webhook delivery
│   ├── analytics.processor.ts     # Analytics & metrics
│   └── quest.processor.ts         # Quest monitoring
├── dto/
│   └── job.dto.ts                 # Request/response DTOs
└── JOB_QUEUE_IMPLEMENTATION.md    # Full documentation
```

## Quick Start

### 1. Create a Job

```typescript
import { JobType, JobPriority } from '@modules/jobs/job.types';

// Simple job creation
const job = await jobsService.addJob('email', {
  recipientEmail: 'user@example.com',
  templateId: 'welcome',
});

// With full tracking
const jobLog = await jobLogService.createJobLog({
  jobType: JobType.EMAIL_SEND,
  payload: { ... },
  organizationId: 'org-123',
  userId: 'user-456',
});
```

### 2. Query Jobs

```typescript
// REST API
GET /api/v1/jobs?status=completed&organizationId=org-123

// Service method
const { data, total } = await jobLogService.queryJobLogs({
  status: JobStatus.COMPLETED,
  organizationId: 'org-123',
  limit: 50,
});
```

### 3. Monitor Dashboard

```
GET /api/v1/jobs/monitoring/dashboard

Returns:
- Total jobs, pending, processing, completed, failed
- Success/failure rates
- Top failing job types
- Recent failures
```

### 4. Schedule Recurring Task

```typescript
const schedule = await jobSchedulerService.createSchedule(
  JobType.CLEANUP_OLD_LOGS,
  '0 2 * * *',  // Daily at 2 AM
  { olderThanDays: 90 },
  { timezone: 'America/New_York' },
);
```

## Job Types Quick Reference

| Job Type | Queue | Priority | Timeout | Max Attempts | Use Case |
|----------|-------|----------|---------|--------------|----------|
| `PAYOUT_PROCESS` | payouts | HIGH | 60s | 3 | Process Stellar payment |
| `EMAIL_SEND` | email | MEDIUM | 30s | 5 | Send single email |
| `EMAIL_DIGEST` | email | MEDIUM | 30s | 5 | Send bulk digest |
| `DATA_EXPORT` | exports | MEDIUM | 5m | 5 | Export data to CSV/JSON |
| `REPORT_GENERATE` | reports | LOW | 10m | 3 | Generate report PDF |
| `CLEANUP_EXPIRED_SESSIONS` | cleanup | LOW | 5m | 5 | Delete old sessions |
| `CLEANUP_OLD_LOGS` | cleanup | LOW | 5m | 5 | Archive/delete old logs |
| `DATABASE_MAINTENANCE` | maintenance | LOW | 15m | 2 | VACUUM/ANALYZE queries |
| `WEBHOOK_DELIVER` | webhooks | MEDIUM | 30s | 10 | POST to webhook URL |
| `WEBHOOK_RETRY` | webhooks | MEDIUM | 30s | 10 | Retry failed webhook |
| `ANALYTICS_AGGREGATE` | analytics | LOW | 2m | 5 | Aggregate analytics |
| `METRICS_COLLECT` | analytics | LOW | 2m | 5 | Collect system metrics |
| `QUEST_DEADLINE_CHECK` | quests | MEDIUM | 60s | 5 | Check quest deadlines |
| `QUEST_COMPLETION_VERIFY` | quests | MEDIUM | 60s | 5 | Verify quest completion |

## Common Patterns

### Pattern 1: Error Handling

```typescript
try {
  const job = await jobsService.addJob(queueName, payload);
  return { jobId: job.id, status: 'queued' };
} catch (error) {
  logger.error('Job creation failed', error);
  throw new BadRequestException(error.message);
}
```

### Pattern 2: Progress Tracking

```typescript
// In processor
await job.updateProgress(25);  // 25% complete

// Query progress
const jobLog = await jobLogService.getJobLog(jobId);
console.log(`Progress: ${jobLog.progress}%`);
```

### Pattern 3: Correlation Tracking

```typescript
// Link related jobs
const correlationId = `order-${orderId}`;

await jobLogService.createJobLog({
  jobType: JobType.EMAIL_SEND,
  correlationId,  // Links to other jobs with same ID
  ...
});

// Later, get all related jobs
const related = await jobLogService.getRelatedJobs(correlationId);
```

### Pattern 4: Retry on Failure

```typescript
// REST API
POST /api/v1/jobs/job-123/retry
{
  "delayMs": 5000,
  "updatedPayload": { ... }
}

// Service method
await jobLogService.recordRetryAttempt(jobId, attemptNumber, error);
```

### Pattern 5: Scheduling

```typescript
// Daily at 2 AM
await jobSchedulerService.createSchedule(
  JobType.CLEANUP_OLD_LOGS,
  '0 2 * * *',
  { olderThanDays: 90 },
);

// Every Monday at 9 AM
await jobSchedulerService.createSchedule(
  JobType.REPORT_GENERATE,
  '0 9 * * 1',
  { reportType: 'weekly' },
);

// Every 15 minutes
await jobSchedulerService.createSchedule(
  JobType.METRICS_COLLECT,
  '*/15 * * * *',
  { metricsToCollect: ['cpu', 'memory'] },
);
```

## Key Services

### JobsService
Core queue management

```typescript
addJob(queueName, data, options)    // Add job to queue
getQueue(name)                      // Get queue instance
```

### JobLogService
Logging and querying

```typescript
createJobLog(data)                  // Create log entry
updateJobLog(id, updates)           // Update status/result
queryJobLogs(filters)               // Search with filters
getStatisticsByStatus()             // Status counts
getPerformanceMetrics()             // Duration statistics
getRecentlyFailedJobs()             // Recent failures
```

### JobSchedulerService
Cron scheduling

```typescript
createSchedule(type, cron, payload, options)  // Create schedule
getActiveSchedules()                          // List active
triggerScheduleNow(scheduleId)                // Manual trigger
disableSchedule/enableSchedule                // Toggle
```

## Database Entities

### JobLog
Main audit trail for all jobs

```typescript
id                    // UUID, primary key
jobType              // From JobType enum
status               // From JobStatus enum
attempt              // Current attempt number
durationMs           // Execution time
errorMessage         // Failure message
result               // JSON result data
organizationId       // Multi-tenancy
userId               // Who triggered
correlationId        // Link related jobs
createdAt/updatedAt  // Timestamps
```

### JobSchedule
Recurring scheduled jobs

```typescript
id                    // UUID
jobType              // Job to schedule
cronExpression       // Cron format
isActive             // Enable/disable
nextRunAt            // When it runs next
lastRunAt            // Last execution
successCount         // Successful runs
failureCount         // Failed runs
```

### JobDependency
Job execution ordering

```typescript
parentJobId          // Must complete first
childJobId           // Waits for parent
blockOnFailure       // Fail child if parent fails
```

## REST API Endpoints

```
POST   /api/v1/jobs                    # Create job
GET    /api/v1/jobs                    # Query jobs
GET    /api/v1/jobs/:jobId             # Get details
POST   /api/v1/jobs/bulk               # Bulk create
POST   /api/v1/jobs/:jobId/retry       # Retry job
DELETE /api/v1/jobs/:jobId             # Cancel job
PATCH  /api/v1/jobs/:jobId/reschedule  # Reschedule

GET    /api/v1/jobs/monitoring/dashboard    # Dashboard
GET    /api/v1/jobs/stats/queues            # Queue stats
GET    /api/v1/jobs/related/:correlationId  # Trace jobs

POST   /api/v1/jobs/schedules              # Create schedule
GET    /api/v1/jobs/schedules/list         # List schedules
GET    /api/v1/jobs/schedules/:id          # Get schedule
POST   /api/v1/jobs/schedules/:id/trigger  # Trigger now
DELETE /api/v1/jobs/schedules/:id          # Delete schedule
```

## Configuration

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379
JOB_QUEUE_CONCURRENCY=10
JOB_MAX_ATTEMPTS=5
JOB_BACKOFF_DELAY=5000
JOB_LOG_RETENTION_DAYS=90
```

### Queue Concurrency

Edit `jobs.constants.ts`:

```typescript
export const JOB_QUEUE_CONFIG = {
  payouts: { concurrency: 10 },
  email: { concurrency: 20 },
  // Scale based on needs
};
```

## Testing

```bash
# Run job processor tests
npm run test:jobs

# Run with coverage
npm run test:jobs -- --coverage

# Watch mode
npm run test:jobs -- --watch
```

## Debugging

### Check Job Status

```bash
# Redis CLI
redis-cli

# List pending jobs
llen bull:email:wait

# Check queue status
hgetall bull:email:meta
```

### Enable Debug Logging

```typescript
// In jobs service
logger.debug(`Job ${id} progress: ${progress}%`);
logger.error(`Job ${id} failed: ${error.message}`);
```

### Monitor in Real-Time

```
GET /api/v1/jobs/monitoring/dashboard  # Refresh every 5 seconds
GET /api/v1/jobs/stats/queues          # Queue health
```

## Troubleshooting Checklist

- [ ] Redis is running (`redis-cli ping`)
- [ ] Job log tables exist (check migrations)
- [ ] Queue concurrency is appropriate for hardware
- [ ] Processor handlers don't throw unhandled exceptions
- [ ] Job payloads are serializable to JSON
- [ ] No memory leaks in long-running processors
- [ ] External services (email, webhooks) are accessible
- [ ] Cron expressions are valid (`*/5 * * * *`)
- [ ] Timezone in schedules is correct (UTC or TZ name)

## Performance Optimization

1. **Increase Concurrency** for I/O-bound jobs (email, webhooks)
2. **Decrease Concurrency** for CPU-bound jobs (exports, analytics)
3. **Archive Old Logs** regularly using cleanup jobs
4. **Index Queries** on frequently filtered columns
5. **Use Correlation IDs** for grouping related operations
6. **Monitor Slow Jobs** with performance dashboard

## Next Steps

1. Integrate with email service (SendGrid/AWS SES)
2. Implement Stellar SDK integration in payout processor
3. Add webhook signature verification
4. Create monitoring dashboard UI
5. Set up alerts for high failure rates
6. Configure log archival to S3/GCS
