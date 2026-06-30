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
