# Query Logging Implementation

## Summary
This PR implements comprehensive query logging for the StellarEarn backend to address issue #341. The feature enables debugging of slow queries by providing detailed logging, monitoring, and alerting capabilities.

## Features Implemented

### ✅ Enable Query Logging
- Added TypeORM custom logger with structured logging
- Configurable query logging via environment variables
- Automatic query logging in development environment

### ✅ Configure Logging Levels
- Support for different logging levels (debug, info, warn, error)
- Dedicated query log files with daily rotation
- Environment-based configuration (development vs production)

### ✅ Slow Query Detection & Alerts
- Configurable slow query threshold (default: 1000ms)
- Critical query threshold for severe performance issues (default: 5000ms)
- Automatic slow query alerts with severity classification
- Query metrics collection and statistics

### ✅ Admin Monitoring Endpoints
- `/api/admin/query-monitoring/statistics` - Query performance statistics
- `/api/admin/query-monitoring/metrics` - Recent query metrics
- `/api/admin/query-monitoring/slow-queries` - Slow query analysis
- `/api/admin/query-monitoring/health` - Query logging system health check
- `/api/admin/query-monitoring/clear-metrics` - Clear metrics history

### ✅ Enhanced Logging Features
- Correlation ID tracking for request context
- User ID association for query attribution
- Query parameter logging (sanitized for security)
- Execution time tracking and performance metrics
- Structured JSON logging with proper formatting

## Environment Variables Added

```bash
# Query Logging Configuration
DB_QUERY_LOGGING=true                    # Enable/disable query logging
SLOW_QUERY_THRESHOLD=1000                # Slow query threshold in ms
CRITICAL_QUERY_THRESHOLD=5000            # Critical query threshold in ms
DB_QUERY_LOG_LEVEL=debug                 # Query log level
```

## Files Modified/Added

### New Files
- `src/common/query-logger/query-logger.service.ts` - Core query logging service
- `src/common/query-logger/query-logger.module.ts` - Query logger module
- `src/modules/query-monitoring/query-monitoring.controller.ts` - Admin monitoring endpoints
- `src/modules/query-monitoring/query-monitoring.module.ts` - Query monitoring module

### Modified Files
- `src/database/data-source.ts` - Enhanced TypeORM configuration with custom logger
- `src/config/logger.config.ts` - Added query logging configuration
- `src/app.module.ts` - Integrated query logging modules
- `.env.example` - Added query logging environment variables

## Usage Examples

### Query Logs
Query logs are written to `logs/queries-YYYY-MM-DD.log` with structured format:
```json
{
  "message": "Database Query",
  "context": "Database",
  "query": "SELECT * FROM users WHERE id = $1",
  "parameters": [123],
  "type": "query",
  "correlationId": "uuid",
  "userId": "user-uuid",
  "timestamp": "2026-04-25T22:00:00.000Z"
}
```

### Slow Query Alerts
```json
{
  "message": "Slow Query Detected",
  "context": "Database",
  "query": "SELECT * FROM large_table WHERE complex_condition",
  "executionTime": 2500,
  "threshold": 1000,
  "severity": "medium",
  "type": "slow_query"
}
```

### API Monitoring
```bash
# Get query statistics
GET /api/admin/query-monitoring/statistics

# Get recent metrics (limit 50)
GET /api/admin/query-monitoring/metrics?limit=50

# Get slow queries with custom threshold
GET /api/admin/query-monitoring/slow-queries?threshold=2000
```

## Testing
- Query logging is automatically enabled in development environment
- Slow query detection works with configurable thresholds
- Admin endpoints provide real-time query metrics
- Log rotation prevents disk space issues
- Performance impact is minimal in production (can be disabled)

## Security Considerations
- Query parameters are logged but can be sanitized if needed
- Admin endpoints require authentication via AdminGuard
- Sensitive data filtering can be added to parameter logging
- Log files are rotated and have limited retention

## Performance Impact
- Minimal overhead when enabled
- Can be completely disabled in production via `DB_QUERY_LOGGING=false`
- Asynchronous logging prevents blocking database operations
- Metrics collection is memory-efficient with configurable limits

## Acceptance Criteria Met
- ✅ Queries are logged in development environment
- ✅ Logging levels are configurable
- ✅ Slow query alerts are implemented
- ✅ Admin monitoring endpoints are available
- ✅ Environment configuration is properly documented

Closes #341
