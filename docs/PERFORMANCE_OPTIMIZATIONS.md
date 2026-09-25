# ⚡ Production Build Optimizations

To maintain optimal bundle sizes and fast TTFB/LCP metrics across production deployments, `next.config.js` leverages SWC compiler features and import modularization.

## Enabled Optimizations

1. **SWC Minification (`swcMinify: true`)**: Replaces Terser with Next.js SWC for faster build times and tighter JS minification.
2. **Modularize Imports (`modularizeImports`)**: Rewrites barrel file imports (`import { map } from 'lodash'`) to direct subpath imports (`import map from 'lodash/map'`).
3. **Console Stripping (`compiler.removeConsole`)**: Removes debug logs in production bundles while preserving `console.error`.

## Measuring Bundle Size

To run `@next/bundle-analyzer` locally:

```bash
ANALYZE=true npm run build
```

## Date Handling: Native Intl Instead of Heavy Date Libraries

### Audit result (July 2026)

The frontend (`FrontEnd/my-app`) ships **zero date-library code**. All date
parsing/formatting goes through native `Intl` APIs wrapped by two first-party
utilities:

| Utility | Responsibility |
| --- | --- |
| `lib/utils/date.ts` | Safe parsing, validation, timezone-aware formatting (`Intl.DateTimeFormat`) |
| `lib/utils/i18n-formatters.ts` | Localised date/number formatting, relative dates (`Intl.RelativeTimeFormat`) |

Verified via `package.json`, `package-lock.json` (no direct **or transitive**
occurrence of `moment`, `moment-timezone`, `dayjs`, or `luxon`), and a
full-source import scan.

Backend-side, `moment`/`luxon`/`dayjs` appear only as transitive dependencies
of `file-stream-rotator` (winston log rotation), `cron`, and `typeorm`. These
run server-side only and contribute nothing to any client bundle; replacing
them would require forking upstream packages.

### Bundle-weight comparison (minified, per Bundlephobia)

| Approach | Client bundle cost |
| --- | --- |
| `moment` | ≈72 KB (≈295 KB with locales, not tree-shakeable) |
| `luxon` | ≈80 KB |
| `dayjs` | ≈7 KB core (+ per-plugin) |
| `date-fns` (tree-shaken) | ≈1–2 KB per imported function |
| **Native `Intl` (current)** | **0 KB** — built into every supported browser, locales included |

Staying on `Intl` keeps the date-handling contribution to every route's
first-load JS at 0 KB, i.e. ≈72–295 KB smaller than a moment-based
equivalent, with locale data provided by the browser for free.

### Regression guards

1. **ESLint** — `no-restricted-imports` in `FrontEnd/my-app/eslint.config.mjs`
   fails the lint on any import of `moment`, `moment-timezone`, `dayjs`, or
   `luxon`, with messages pointing at the sanctioned utilities.
2. **Unit tests** — `lib/utils/__tests__/date-library-ban.test.ts` fails if a
   banned package appears in `package.json` or (transitively) in
   `package-lock.json`, and sanity-checks the Intl utilities still work.
3. **Existing coverage** — `lib/utils/__tests__/date.test.ts` and
   `lib/utils/i18n-formatters.test.ts` pin the formatting behaviour itself.

If `Intl` ever proves insufficient (e.g. complex date arithmetic), the
sanctioned fallback is `date-fns`: it is tree-shakeable and already covered by
`modularizeImports`/`optimizePackageImports` in `next.config.ts`.

## Backend: Batch Payout Transactions

`StellarService.sendBatchPayments()` batches up to 100 payment operations into a
single Stellar transaction, reducing per-transaction fees and RPC round-trips.
The `PayoutsService.processBatchPayouts()` cron (every 30s) groups pending and
retry-scheduled payouts by asset, calls `sendBatchPayments`, and handles
partial failures per batch. Batches exceeding 100 operations are automatically
split into multiple transactions (#1981).