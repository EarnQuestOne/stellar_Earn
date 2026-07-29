# ⚡ Incremental Static Regeneration (ISR) - Quest Listing

To optimize response times and reduce load on backend RPC nodes, the public quest listing page utilizes **Incremental Static Regeneration (ISR)** with a revalidation window of **60 seconds**.

## Strategy Overview

1. **Static Pre-rendering**: Requests are served directly from the edge CDN cache (`stale-while-revalidate` behavior).
2. **Background Revalidation**: When a request arrives after 60 seconds, Next.js serves the cached page and triggers a background revalidation to rebuild the static HTML with fresh quest data.
3. **Fallback Handling**: If data fetching fails during background revalidation, the previous valid cache is retained, ensuring high availability.