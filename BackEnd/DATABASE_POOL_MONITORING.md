# Database Connection Pool Monitoring

## Overview

This document describes the database connection pool monitoring implementation for StellarEarn. The monitoring system provides visibility into PostgreSQL connection pool usage, alerts on exhaustion scenarios, and helps diagnose database-related performance issues.

## Available Metrics

The following metrics are exposed via the `/health/metrics` endpoint in Prometheus format:

### Connection Pool Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `db_pool_active_connections` | Gauge | Number of active database connections currently in use |
| `db_pool_idle_connections` | Gauge | Number of idle database connections available in the pool |
| `db_pool_total_connections` | Gauge | Total number of database connections (active + idle) |
| `db_pool_waiting_requests` | Gauge | Number of requests waiting for a connection from the pool |
| `db_pool_utilization_percent` | Gauge | Pool utilization as percentage of max connections |

### Acquisition Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `db_pool_acquire_duration_ms` | Histogram | Time to acquire a connection from pool in milliseconds |
| `db_pool_timeout_total` | Counter | Total connection timeout events |
| `db_pool_failed_connections_total` | Counter | Total failed connection attempts |
| `db_pool_retry_total` | Counter | Total connection retry attempts |
| `db_pool_exhaustion_total` | Counter | Total pool exhaustion events |

## API Endpoints

### GET /health/pool

Returns current pool statistics in JSON format:

```json
{
  "stats": {
    "totalConnections": 5,
    "activeConnections": 3,
    "idleConnections": 2,
    "waitingRequests": 0
  },
  "config": {
    "max": 10,
    "min": 0,
    "connectionTimeoutMillis": 10000,
    "idleTimeoutMillis": 30000
  },
  "utilization": 50.0,
  "averageAcquisitionTime": 15.5
}
```

### GET /health/metrics

Returns all metrics in Prometheus text exposition format for scraping by Prometheus or other monitoring systems.

### GET /health/detailed

Returns a JSON snapshot of all system metrics including database pool metrics.

## Alert Rules

The following alert rules are configured in the AlertService:

### Critical Alerts

| Alert Name | Condition | Cooldown | Description |
|------------|-----------|----------|-------------|
| `db_pool_high_utilization` | Utilization > 90% | 5 minutes | Pool utilization is critically high, immediate attention required |
| `high_error_rate` | HTTP error rate > 10% | 2 minutes | High error rate across the application |

### Warning Alerts

| Alert Name | Condition | Cooldown | Description |
|------------|-----------|----------|-------------|
| `db_pool_elevated_utilization` | Utilization > 75% | 5 minutes | Pool utilization is elevated, monitor closely |
| `db_pool_waiting_queue_growth` | Waiting requests > 5 | 2 minutes | Requests are queuing for connections |
| `db_pool_slow_acquisition` | Avg acquisition time > 500ms | 3 minutes | Connection acquisition is slow |
| `high_p95_latency` | p95 latency > 2000ms | 1 minute | Request latency is elevated |
| `high_heap_usage` | Heap used > 900MB | 5 minutes | Memory usage is high |

## Dashboard

A Grafana dashboard configuration is provided at `monitoring/grafana/dashboards/database-pool-dashboard.json`.

### Dashboard Panels

1. **Pool Utilization %** - Gauge showing current pool utilization with thresholds at 75% (yellow) and 90% (red)
2. **Connection Counts** - Time series showing active, idle, and total connections
3. **Waiting Queue Size** - Stat showing current number of waiting requests
4. **Connection Acquisition Latency** - Time series of average connection acquisition time
5. **Error Rates** - Time series of timeouts, failed connections, and exhaustion events
6. **Connection Retries** - Time series of connection retry attempts

### Importing the Dashboard

1. Open Grafana
2. Navigate to Dashboards → Import
3. Upload the JSON file or paste the content
4. Configure the Prometheus datasource
5. Save the dashboard

## Troubleshooting

### Identifying Pool Exhaustion

**Symptoms:**
- `db_pool_total_connections` equals `db_pool_active_connections` (no idle connections)
- `db_pool_waiting_requests` > 0
- `db_pool_exhaustion_total` counter increasing
- Alert `db_pool_high_utilization` firing

**Root Causes:**
- Insufficient max pool size for current load
- Long-running queries holding connections
- Connection leaks (connections not released properly)
- Sudden traffic spikes

**Actions:**
1. Check `/health/pool` endpoint for current state
2. Review slow query logs for long-running queries
3. Increase `max` pool size in database configuration
4. Investigate connection leaks in application code
5. Consider implementing connection timeouts

### High Acquisition Latency

**Symptoms:**
- `db_pool_acquire_duration_ms` histogram shows high values
- `db_pool_slow_acquisition` alert firing
- Increased `db_pool_waiting_requests`

**Root Causes:**
- Pool exhaustion (all connections in use)
- Database server under heavy load
- Network latency to database
- Contention for database resources

**Actions:**
1. Check pool utilization
2. Review database server metrics (CPU, memory, I/O)
3. Check network latency to database
4. Increase pool size if consistently high utilization
5. Optimize database queries

### Connection Timeouts

**Symptoms:**
- `db_pool_timeout_total` counter increasing
- Application errors with "connection timeout"
- `db_pool_failed_connections_total` increasing

**Root Causes:**
- Pool exhaustion with long wait times
- Database server unresponsive
- Network issues
- Connection timeout too low

**Actions:**
1. Check pool utilization and waiting queue
2. Verify database server health
3. Check network connectivity
4. Consider increasing `connectionTimeoutMillis` in pool config
5. Increase pool size if needed

### Connection Leaks

**Symptoms:**
- `db_pool_active_connections` consistently high
- `db_pool_idle_connections` consistently low or zero
- Pool exhaustion even under moderate load

**Root Causes:**
- Connections not properly released in code
- Unhandled exceptions preventing connection release
- Long-running transactions

**Actions:**
1. Review code for proper connection handling
2. Ensure connections are released in finally blocks
3. Use connection pooling best practices
4. Implement connection leak detection if available
5. Review transaction management

## Scaling Recommendations

### When to Increase Pool Size

Increase the `max` pool size when:
- Consistent utilization > 75%
- Frequent waiting queue growth
- Connection timeouts occurring
- Database server has capacity (CPU, memory, I/O)

### Recommended Pool Sizing

**Formula:** `max_connections = (number_of_app_instances * average_concurrent_queries_per_instance) + buffer`

**Example:**
- 3 application instances
- 10 concurrent queries per instance
- 20% buffer
- `max = (3 * 10) * 1.2 = 36`

**Database Server Considerations:**
- Ensure PostgreSQL `max_connections` setting is sufficient
- Monitor database server resource usage
- Consider connection pooling at the database level (PgBouncer)

## Configuration

Pool configuration is set in `src/config/ormconfig.ts`:

```typescript
extra: {
  ssl: {
    rejectUnauthorized: false,
    require: true,
  },
  // Connection pool settings
  max: 10,                          // Maximum pool size
  connectionTimeoutMillis: 10000,   // Connection acquisition timeout
  idleTimeoutMillis: 30000,         // Idle connection timeout
}
```

### Environment Variables

Pool settings can be overridden via environment variables by updating the configuration to read from `process.env`:

```bash
DB_POOL_MAX=20
DB_POOL_CONNECTION_TIMEOUT=15000
DB_POOL_IDLE_TIMEOUT=60000
```

## Monitoring Verification

### Manual Verification

1. **Check metrics endpoint:**
   ```bash
   curl http://localhost:3001/health/metrics
   ```

2. **Check pool status:**
   ```bash
   curl http://localhost:3001/health/pool
   ```

3. **Generate load and observe metrics:**
   - Use a load testing tool (e.g., k6, artillery)
   - Monitor `/health/pool` during load test
   - Verify metrics are updating correctly

### Prometheus Verification

1. Configure Prometheus to scrape `/health/metrics`
2. Verify metrics appear in Prometheus UI
3. Query metrics in PromQL:
   ```promql
   db_pool_utilization_percent
   rate(db_pool_timeout_total[5m])
   histogram_quantile(0.95, rate(db_pool_acquire_duration_ms_bucket[5m]))
   ```

### Alert Verification

1. Simulate pool exhaustion by reducing max pool size
2. Verify alerts fire in logs
3. Verify alerts respect cooldown periods
4. Check alert resolution when condition clears

## Failure Handling

The monitoring service is designed to fail safely:

- **Metrics collection failures** are logged but do not crash the application
- **Missing pool data** returns zeros rather than throwing errors
- **Alert evaluation failures** are logged and do not affect other alerts
- **Service initialization failures** are logged but allow application to start

## Implementation Details

### Monitoring Service

The `DatabasePoolMonitorService`:
- Polls pool statistics every 15 seconds
- Updates metrics via `MetricsService`
- Detects exhaustion conditions with cooldown periods
- Logs critical events with structured data
- Handles DB restarts gracefully

### Integration Points

- **HealthModule**: Provides the monitoring service
- **MetricsService**: Exposes metrics in Prometheus format
- **AlertService**: Evaluates alert rules based on pool metrics
- **LoggerService**: Logs structured events with correlation IDs

## Security Considerations

- Pool statistics do not expose sensitive database credentials
- Metrics endpoint is read-only
- No database queries are executed for monitoring (reads pool state only)
- Logs do not contain connection strings or passwords

## Performance Impact

- **Polling overhead**: Minimal (15-second interval, single query to pool state)
- **Memory overhead**: Negligible (stores last 100 acquisition time samples)
- **Network overhead**: None (reads local pool state)
- **Application overhead**: None (runs in background with unref'd timer)

## Future Enhancements

Potential improvements for future iterations:

- Add histogram buckets for acquisition time
- Implement connection leak detection
- Add per-database metrics for multi-database setups
- Integrate with APM tools (Datadog, New Relic)
- Add predictive alerting based on trends
- Implement automatic pool scaling based on metrics
