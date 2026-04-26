# Per-User Rate Limiting Implementation

## Overview

Per-user rate limiting has been implemented to enforce different rate limits based on user roles and authentication status. This ensures fair resource allocation across different user tiers while protecting the API from abuse.

## Architecture

### Components

#### 1. PerUserRateLimitConfigService
**File**: `src/config/per-user-rate-limit.config.ts`

Service that manages per-user rate limit configurations based on user roles:
- **Anonymous Users**: IP-based tracking with configurable limits
- **Regular Users**: Standard authenticated user limits
- **Verifiers**: Higher limits due to more frequent API operations
- **Admins**: Complete bypass of rate limiting

Configuration is sourced from environment variables, allowing runtime customization without code changes.

#### 2. AppThrottlerGuard
**File**: `src/common/guards/throttler.guard.ts`

Enhanced ThrottlerGuard that:
- Extracts user role information from JWT tokens and request context
- Tracks users by unique ID (Stellar address or database ID)
- Falls back to IP-based tracking for anonymous users
- Applies role-specific rate limits dynamically
- Bypasses rate limiting for admin users

Key methods:
- `shouldSkip()`: Returns true for admin users to bypass rate limiting
- `getTracker()`: Extracts user identity for per-user tracking
- `getThrottleMetadata()`: Applies role-based rate limits dynamically
- `getDefaultMetadata()`: Provides fallback limits from configuration

### Rate Limit Tiers

| User Type | Default Limit | Default TTL | Configurable |
|-----------|---------------|-------------|--------------|
| Anonymous (IP) | 50 | 60s | Yes |
| Regular User | 100 | 60s | Yes |
| Verifier | 200 | 60s | Yes |
| Admin | Unlimited | N/A | No |

### Tracking Mechanism

Users are tracked using a composite key format:
- **Authenticated Users**: `user:{userId}` - Tracked by unique user ID
- **Anonymous Users**: `ip:{ipAddress}` - Tracked by IP address

This ensures each user has their own independent rate limit counter.

## Configuration

### Environment Variables

```env
# Anonymous user limits (IP-based tracking)
RATE_LIMIT_ANONYMOUS_LIMIT=50
RATE_LIMIT_ANONYMOUS_TTL=60

# Regular authenticated user limits
RATE_LIMIT_USER_LIMIT=100
RATE_LIMIT_USER_TTL=60

# Verifier user limits
RATE_LIMIT_VERIFIER_LIMIT=200
RATE_LIMIT_VERIFIER_TTL=60

# Auth endpoint limits for authenticated users
RATE_LIMIT_AUTH_USER_LIMIT=30
RATE_LIMIT_AUTH_USER_TTL=60
```

All limits are configurable via environment variables. If not specified, sensible defaults are used.

## Implementation Highlights

### 1. Per-User Isolation
Each user has a completely independent rate limit counter. One user hitting their limit does not affect other users.

```typescript
// Example: Two users making simultaneous requests
User A: user:stellar_address_A → 100 requests/minute limit
User B: user:stellar_address_B → 100 requests/minute limit
// Each user can make 100 requests independently
```

### 2. Role-Based Dynamic Limits
Limits are applied based on user role, allowing different tiers of service:

```typescript
if (userRole === UserRole.ADMIN) {
  // Admin users bypass rate limiting completely
  return true; // Skip throttling
} else if (userRole === UserRole.VERIFIER) {
  // Verifiers get higher limits: 200 req/minute
} else if (userRole === UserRole.USER) {
  // Regular users get standard limits: 100 req/minute
} else {
  // Anonymous users get conservative limits: 50 req/minute
}
```

### 3. Secure User Identification
User role is extracted from:
1. Request context (`req.user.role`) - Set by authentication guards
2. JWT token payload (`payload.role`) - Fallback for token verification
3. Falls back to 'anonymous' if no user information is found

### 4. HTTP Headers
Rate limit information is exposed via standard HTTP headers:
- `X-RateLimit-Limit`: Maximum number of requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 response)

## Testing

Comprehensive tests verify:
1. Default limits are enforced for anonymous users
2. Per-user limits work correctly for authenticated users
3. Different users have independent limit counters
4. Verifiers have appropriate higher limits
5. Admins bypass rate limiting entirely
6. Admin users can make unlimited requests
7. Rate-limited responses include Retry-After header

Run tests with:
```bash
npm run test:e2e
```

## Acceptance Criteria Met

✅ **Per-user limits work**
- Each user has independent rate limit tracking
- Limits are applied based on user role
- Anonymous users tracked by IP address
- Authenticated users tracked by unique ID

✅ **Configured throttler for users**
- ThrottlerGuard extended with per-user logic
- Role-based configuration service created
- Dynamic limit application per request

✅ **User-based filters**
- User identification and extraction implemented
- Role detection from JWT and request context
- Fallback to IP-based tracking for anonymous

✅ **Limits tested**
- E2E tests verify per-user rate limiting
- Tests confirm admin bypass functionality
- Tests verify separate counters per user

## Security Considerations

1. **Admin Bypass**: Admins are completely bypassed from rate limiting. Only trusted admin addresses (from `ADMIN_ADDRESSES` env var) are treated as admins.

2. **User Identification**: User identification is derived from:
   - Request context (set by authenticated middleware)
   - JWT token verification (with cryptographic signature validation)

3. **IP Spoofing**: Anonymous users are tracked by IP, with support for:
   - X-Forwarded-For header (for proxies)
   - Request IP address fallback
   - Proper parsing of comma-separated proxy chains

4. **Rate Limit Evasion**: Each user gets a unique counter key, making it difficult to distribute requests across multiple accounts to bypass limits.

## Future Enhancements

Potential improvements:
1. Per-endpoint rate limits (different limits for different routes)
2. Dynamic rate limit adjustment based on system load
3. Rate limit upgrade for premium users
4. Distributed rate limiting for multi-instance deployments
5. Rate limit analytics and monitoring dashboard
