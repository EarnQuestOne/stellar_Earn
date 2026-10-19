# Frontend Data-Fetching and Caching Convention

This convention defines how the StellarEarn frontend requests, caches,
revalidates, and invalidates server data. It applies to the Next.js application
in `FrontEnd/my-app` and to every component that reads from the backend API.

- **Owner:** Frontend maintainers
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [API-client contract sync](API_CLIENT_SYNC.md), [Dependency policy](../DEPENDENCY_POLICY.md), [CI/CD policy](../CICD_POLICY.md)

## Data-fetching model

- Server-rendered routes fetch on the server through the shared API client.
  Client components use TanStack Query for interactive, user-specific, or
  frequently revalidated data.
- Components do not call `fetch` or Axios directly. All requests go through the
  shared API client so that authentication, error handling, tracing, and
  cancellation are applied consistently.
- Public data that does not depend on the user may be cached and revalidated at
  the route level. Authenticated data is fetched per request and never shared
  between users.
- A component renders from the query result; it does not copy server data into
  local state unless the user is editing it.

## Query keys

- Query keys are arrays whose first element is a stable resource name, for
  example `['quests', 'list', filters]` or `['quest', questId]`.
- Keys include every parameter that affects the response: filters, pagination,
  sort order, and the current user or account scope when the response differs by
  identity.
- Keys are built by shared key factories, not by string concatenation in
  components.
- Keys never contain secrets, access tokens, or unhashed personal data.
- Mutations invalidate the narrowest key that covers the changed data. Broad
  invalidation such as clearing every query is reserved for logout and account
  changes.

## Staleness and revalidation

| Data class | `staleTime` | Revalidation |
|------------|-------------|--------------|
| Public quest list and detail | 60 seconds | On focus and after a related mutation |
| Public profile and leaderboard | 5 minutes | On focus; periodic refresh where the view is live |
| Authenticated account and wallet state | 0-15 seconds | On mount and focus; refetch after a transaction |
| Payout and submission status | 15 seconds while pending | Poll with backoff until terminal, then stop |
| Static reference data | 30 minutes or longer | On deploy or version change |

- `gcTime` is set explicitly for user-specific data so that it is discarded
  promptly after logout.
- Retries are limited to transient failures, use exponential backoff, and do not
  retry 4xx responses. Mutations are not retried automatically unless they are
  idempotent.
- Requests are cancelled when a component unmounts or its key changes.
- Identical in-flight requests are deduplicated. Prefetching is allowed only for
  data the user is likely to open and must not block rendering.

## Mutations

- A mutation invalidates affected queries after success. Optimistic updates are
  allowed only when the server response is deterministic and the UI can roll back
  on failure.
- Financial actions, wallet signatures, and irreversible changes are never
  optimistic. They show pending state and reconcile with the server response.
- After a successful mutation, the UI updates the cache from the server response
  where possible instead of triggering an immediate duplicate request.
- Errors are surfaced through the shared error state and do not leave a
  permanently pending UI.

## Server rendering and hydration

- Server-fetched data is passed to the client cache with a dehydrated state so
  that the first render does not refetch unnecessarily.
- Server code uses the same API client contract and does not embed credentials in
  client bundles.
- Data that depends on the authenticated user is not cached in a shared CDN
  layer.

## Verification

- Tests mock the API at the network boundary with MSW and assert cache behaviour,
  invalidation, retries, and cancellation.
- New query keys are reviewed for completeness and user scoping.
- A data view implements loading, empty, error, and refreshing states.
- Reviewers reject direct SDK calls, ad-hoc cache keys, and unbounded polling.

## Ownership and review

The frontend maintainers own this convention. The policy is reviewed every six
months and whenever the data-fetching library, API version, or rendering model
changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
