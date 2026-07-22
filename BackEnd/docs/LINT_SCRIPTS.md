# Lint Scripts

This project uses two lint script variants:

## `npm run lint`

Runs ESLint in **check-only** mode (no auto-fix). Used in CI to verify code quality.

```bash
npm run lint
```

## `npm run lint:fix`

Runs ESLint with **auto-fix** enabled. Use locally before committing.

```bash
npm run lint:fix
```

### Setup

Add to `BackEnd/package.json` scripts:

```json
{
  "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
  "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
}
```
