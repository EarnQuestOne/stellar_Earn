import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Layer order (lower index = lower level; higher layers may import lower ones,
 * but not the other way around):
 *
 *   lib  →  context  →  components  →  app
 */
const eslintConfig = [
  // ── Global Ignores ──────────────────────────────────────────────────────────
  // Must be first and standalone to intercept directory tracking paths
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),

  // Wrap legacy eslint-config-next via FlatCompat
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  prettier,

  // ── Import-boundary rules ──────────────────────────────────────────────────
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'lib', pattern: 'lib/**' },
        { type: 'context', pattern: 'context/**' },
        { type: 'components', pattern: 'components/**' },
        { type: 'app', pattern: 'app/**' },
      ],
      'boundaries/ignore': ['**/*.test.*', '**/*.spec.*', '**/tests/**'],
    },
    rules: {
      // Warn so existing violations surface without blocking CI immediately
      'boundaries/element-types': [
        'warn',
        {
          default: 'disallow',
          rules: [
            // lib is the base layer — no imports from upper layers
            { from: 'lib', allow: ['lib'] },
            // context may use lib
            { from: 'context', allow: ['lib', 'context'] },
            // components may use lib and context
            { from: 'components', allow: ['lib', 'context', 'components'] },
            // app (pages/routes) may use everything
            { from: 'app', allow: ['lib', 'context', 'components', 'app'] },
          ],
        },
      ],
    },
  },

  // ── OptimizedImage enforcement ────────────────────────────────────────────
  // The `eslint-plugin-jsx-a11y` package as installed (v6.10.2) does not
  // expose a `no-img-element` rule — that rule lives in `@next/next`. The
  // `next/core-web-vitals` config (extended above) already enables
  // `@next/next/no-img-element` as `error`, which blocks raw `<img>` tags
  // from compiling. To give developers an actionable error pointing at the
  // canonical wrapper, also surface the rule via ESLint's built-in
  // `no-restricted-syntax` with a hint message.
  //
  // Notes on the selector:
  //   • `<img>` is a JSX void element so the `JSXOpeningElement` selector
  //     alone catches `<img>`, `<img .../>`, and any hypothetical
  //     `<img></img>` — a `JSXClosingElement` entry would be unreachable.
  //   • This complements `@next/next/no-img-element` (already `error` via
  //     `next/core-web-vitals`) by replacing its generic message with a
  //     hint pointing at the canonical wrapper.
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXOpeningElement[name.name="img"]',
          message:
            'Raw <img> tags are banned. Use <OptimizedImage /> from "@/components/ui/OptimizedImage" instead — see components/ui/OptimizedImage.tsx JSDoc for the `sizes` and `priority` guidance.',
        },
      ],
    },
  },

  // ── Heavy date-library ban ────────────────────────────────────────────────
  // All date parsing/formatting must go through the native-Intl utilities in
  // lib/utils/date.ts and lib/utils/i18n-formatters.ts. Heavy date libraries
  // (moment ≈ 72 KB min / ≈ 295 KB with locales, luxon ≈ 80 KB min) add
  // significant client-bundle weight for functionality Intl provides for
  // free. date-fns is the only sanctioned fallback (tree-shakeable, already
  // covered by optimizePackageImports in next.config.ts) for needs Intl
  // cannot cover (e.g. date arithmetic across DST boundaries).
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'moment',
              message:
                'moment is banned (≈72 KB min, not tree-shakeable). Use the Intl-based helpers in "@/lib/utils/date" or "@/lib/utils/i18n-formatters" instead.',
            },
            {
              name: 'moment-timezone',
              message:
                'moment-timezone is banned. Use Intl.DateTimeFormat with the `timeZone` option — see "@/lib/utils/date" (parseZonedDateTime/formatZonedDateTime).',
            },
            {
              name: 'dayjs',
              message:
                'dayjs is banned to keep a single date-handling standard. Use the Intl-based helpers in "@/lib/utils/date" or "@/lib/utils/i18n-formatters" instead.',
            },
            {
              name: 'luxon',
              message:
                'luxon is banned (≈80 KB min). Use the Intl-based helpers in "@/lib/utils/date" or "@/lib/utils/i18n-formatters" instead.',
            },
          ],
          patterns: [
            {
              group: ['moment/*', 'moment-timezone/*', 'dayjs/*', 'luxon/*'],
              message:
                'Heavy date libraries are banned. Use the Intl-based helpers in "@/lib/utils/date" or "@/lib/utils/i18n-formatters" instead.',
            },
          ],
        },
      ],
    },
  },

  // ── Dead code & unreachable branch detection ──────────────────────────────
  {
    rules: {
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-constant-condition': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-sync-scripts': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
];

export default eslintConfig;
