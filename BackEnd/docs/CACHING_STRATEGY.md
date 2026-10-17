# Caching Strategy Implementation Guide

## Overview

This document describes the caching layer implementation for the StellarEarn backend API. The caching strategy uses NestJS Cache Manager with support for both in-memory and Redis-backed caching.

## Architecture

### Components

1. **CacheModule** - Global NestJS module providing caching services
2. **CacheService** - Wrapper service with cache management utilities
3. **Cache Decorators** - `@Cacheable` and `@CacheInvalidate` decorators for method-level caching
4. **Cache Interceptor** - Global interceptor for automatic GET request caching
5. **Cache Controller** - Admin endpoints for cache management and statistics

## Configuration

### Environment Variables

```env
# Cache type: 'memory' or 'redis'
CACHE_TYPE=memory

# Cache TTL in seconds (default: 300 = 5 minutes)
CACHE_TTL=300

# Redis Configuration (if CACHE_TYPE=redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Cache TTL Presets

```typescript
CACHE_TTL = {
  DEFAULT: 300,      // 5 minutes
  SHORT: 60,         // 1 minute
  MEDIUM: 600,       // 10 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
};
```

## Cache Keys

Predefined cache key prefixes for organization:

```typescript
CACHE_KEYS = {
  QUESTS: 'quests',
  QUEST_DETAIL: 'quest_detail',
  SUBMISSIONS: 'submissions',
  SUBMISSION_DETAIL: 'submission_detail',
  PAYOUTS: 'payouts',
  PAYOUT_DETAIL: 'payout_detail',
  USERS: 'users',
  USER_DETAIL: 'user_detail',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications',
};
```

## Usage Patterns

### 1. Service-Level Caching

Inject `CacheService` into your service:

```typescript
import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.config';

@Injectable()
export class QuestsService {
  constructor(private cacheService: CacheService) {}

  async findOne(id: string) {
    const cacheKey = `${CACHE_KEYS.QUEST_DETAIL}:${id}`;

    // Try cache first
    const cached = await this.cacheService.get<Quest>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const quest = await this.questRepository.findOne({ where: { id } });

    // Cache the result
    await this.cacheService.set(cacheKey, quest, CACHE_TTL.LONG * 1000);

    return quest;
  }
}
```

### 2. Using getOrSet Helper

Simplify cache-aside pattern:

```typescript
async findOne(id: string) {
  const cacheKey = `${CACHE_KEYS.QUEST_DETAIL}:${id}`;

  return this.cacheService.getOrSet(
    cacheKey,
    () => this.questRepository.findOne({ where: { id } }),
    CACHE_TTL.LONG * 1000,
  );
}
```

### 3. Cache Invalidation on Mutations

After create/update/delete operations, invalidate related cache:

```typescript
async update(id: string, updateDto: UpdateQuestDto) {
  const updated = await this.questRepository.save({ id, ...updateDto });

  // Invalidate specific key
  await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);

  // Invalidate all keys matching pattern
  await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);

  return updated;
}
```

### 4. Method Decorators (Future Enhancement)

```typescript
@Cacheable({ ttl: 300, key: 'quest_detail_{{id}}' })
async findOne(@Param('id') id: string) {
  return this.questRepository.findOne({ where: { id } });
}

@CacheInvalidate(['quests_', 'quest_detail_'])
async updateQuest(id: string, dto: UpdateQuestDto) {
  return this.questRepository.save({ id, ...dto });
}
```

## Cache Management Endpoints

### Admin Cache Operations

All endpoints require JWT authentication.

#### Get Cache Statistics

```bash
GET /cache/stats
GET /cache/stats?key=quest_detail:123
```

Response:
```json
{
  "hits": 150,
  "misses": 50,
  "hitRate": 75
}
```

#### Clear All Cache

```bash
DELETE /cache/clear
```

#### Clear Cache by Pattern

```bash
DELETE /cache/clear-pattern?pattern=quests_
```

#### Reset Statistics

```bash
DELETE /cache/reset-stats
```

## Caching Strategy by Module

### Quests Module

- **Expensive Queries**: List with filters, pagination
- **Cache Keys**:
  - `quests:{queryParams}` - Paginated lists
  - `quest_detail:{id}` - Individual quest details
- **TTL**: MEDIUM (10 min) for lists, LONG (1 hour) for details
- **Invalidation**: On create, update, delete

**Implementation Details**:
```typescript
// findAll - cache with query parameters
const cacheKey = `${CACHE_KEYS.QUESTS}:${JSON.stringify(queryDto)}`;

// findOne - cache individual quests
const cacheKey = `${CACHE_KEYS.QUEST_DETAIL}:${id}`;

// create/update/delete - invalidate related keys
await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);
await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);
```

### Submissions Module

- **Expensive Queries**: List submissions, detailed verification checks
- **Cache Keys**:
  - `submissions:{userId}` - User submissions
  - `submission_detail:{id}` - Individual submission
- **TTL**: SHORT (1 min) for lists (frequent updates), LONG for details
- **Invalidation**: On status change, verification

### Payouts Module

- **Expensive Queries**: Payout calculations, history
- **Cache Keys**:
  - `payouts:{userId}` - User payouts
  - `payout_detail:{id}` - Individual payout
  - `payout_poll:{id}:{viewerScope}` - Payout status polling snapshots (#1983, see `docs/JOB_RESULT_STATUS_CACHE.md`)
  - `job_status:{jobId}` - Background job status/result snapshots
- **TTL**: LONG (1 hour) - infrequent changes
- **Invalidation**: On approval/rejection

### Analytics Module

- **Expensive Queries**: Aggregations, statistics
- **Cache Keys**:
  - `analytics:daily` - Daily stats
  - `analytics:weekly` - Weekly stats
  - `analytics:user:{userId}` - User analytics
- **TTL**: VERY_LONG (24 hours) - stable data
- **Invalidation**: On schedule (daily refresh)

## Performance Considerations

### When to Cache

✅ **Good candidates**:
- Read-heavy endpoints
- Database aggregations
- Frequently accessed data
- Expensive computations
- Stable data (not rapidly changing)

❌ **Bad candidates**:
- Real-time data
- User-specific sensitive data
- Frequently mutated data
- Small/fast database queries

### Cache Hit Ratio Target

- **Target**: 70-80% cache hit rate
- **Monitor**: Use `/cache/stats` endpoint
- **Optimize**: Adjust TTL based on hit rate

## Monitoring and Debugging

### Enable Cache Logging

```typescript
// In cache.service.ts
private recordAccess(key: string, isHit: boolean): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Cache ${isHit ? 'HIT' : 'MISS'}: ${key}`);
  }
  // ... record stats
}
```

### Cache Statistics Endpoint

```bash
# Get all cache stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/cache/stats

# Get stats for specific key
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/cache/stats?key=quest_detail:123
```

### Database Query Timing

Compare response times with/without cache:

```bash
# Without cache (first request)
time curl http://localhost:3001/quests

# With cache (second request)
time curl http://localhost:3001/quests
```

## Testing

### Unit Tests

```bash
npm run test test/cache/cache.service.spec.ts
npm run test test/cache/cache.decorators.spec.ts
```

### Integration Tests

```bash
npm run test test/cache/quests-cache.integration.spec.ts
```

### E2E Tests with Cache

```bash
# Cache should work transparently with E2E tests
npm run test:e2e test/quests/quests.e2e-spec.ts
```

## Migration Guide

### Adding Cache to Existing Service

1. **Install CacheModule in your module**:
```typescript
@Module({
  imports: [CacheModule],
  // ...
})
export class MyModule {}
```

2. **Inject CacheService**:
```typescript
constructor(private cacheService: CacheService) {}
```

3. **Wrap expensive queries**:
```typescript
async getData() {
  return this.cacheService.getOrSet(
    'data_key',
    () => this.expensiveQuery(),
    CACHE_TTL.MEDIUM * 1000,
  );
}
```

4. **Add cache invalidation**:
```typescript
async updateData(id: string, dto: UpdateDto) {
  const result = await this.repository.save({ id, ...dto });
  await this.cacheService.delete('data_key');
  return result;
}
```

5. **Add tests**:
```typescript
describe('Service with Cache', () => {
  it('should cache results', async () => {
    const result1 = await service.getData();
    const result2 = await service.getData();
    expect(repository.query).toHaveBeenCalledTimes(1); // Only once
  });
});
```

## Troubleshooting

### Cache Not Working

**Check**:
1. CacheModule imported in module
2. CacheService injected correctly
3. Cache key format consistency
4. TTL values (milliseconds vs seconds)

### Memory Issues with In-Memory Cache

**Solutions**:
1. Reduce TTL values
2. Switch to Redis cache
3. Implement cache eviction policy
4. Monitor cache size with `/cache/stats`

### Redis Connection Issues

**Check**:
1. Redis server running: `redis-cli ping`
2. Connection credentials in `.env`
3. Network connectivity
4. Redis logs: `redis-cli MONITOR`

### Stale Cache Issues

**Solutions**:
1. Review invalidation logic
2. Reduce TTL for volatile data
3. Add cache versioning for deployments
4. Manual cache clear: `DELETE /cache/clear`

## Best Practices

1. **Use Meaningful Cache Keys**: Include entity type and ID
   ```typescript
   // ✅ Good
   const key = `${CACHE_KEYS.QUEST_DETAIL}:${id}`;
   
   // ❌ Poor
   const key = `data_${id}`;
   ```

2. **Set Appropriate TTLs**: Match data volatility
   ```typescript
   // Stable data: longer TTL
   CACHE_TTL.VERY_LONG // 24 hours
   
   // Volatile data: shorter TTL
   CACHE_TTL.SHORT // 1 minute
   ```

3. **Invalidate Strategically**: Invalidate only affected keys
   ```typescript
   // ✅ Specific
   await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);
   
   // ❌ Overkill
   await this.cacheService.clear(); // Clears everything
   ```

4. **Handle Cache Failures Gracefully**: Fall back to database
   ```typescript
   try {
     return await this.cacheService.get(key);
   } catch (error) {
     console.warn('Cache error, falling back to DB', error);
     return await this.database.query();
   }
   ```

5. **Monitor Cache Performance**: Check stats regularly
   ```bash
   curl /cache/stats | jq '.[] | select(.hitRate < 50)'
   ```

## Future Enhancements

1. **Cache Warming**: Pre-load frequently used data on startup
2. **Cache Tagging**: Tag related cache entries for grouped invalidation
3. **Cache Compression**: Compress large objects before caching
4. **Distributed Caching**: Use Redis with multiple instances
5. **Cache Analytics**: Detailed hit/miss analysis by endpoint
6. **Automatic Invalidation**: Event-driven cache invalidation
