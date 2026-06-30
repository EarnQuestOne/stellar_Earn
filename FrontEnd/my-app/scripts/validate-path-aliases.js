#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const TS_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.d.ts',
];

function loadTsconfig(tsconfigPath) {
  const fileContents = fs.readFileSync(tsconfigPath, 'utf8');
  return JSON.parse(fileContents);
}

function normalizeWildcardCount(value) {
  return (value.match(/\*/g) || []).length;
}

function existsPathCandidate(candidate) {
  if (fs.existsSync(candidate)) {
    return true;
  }

  for (const ext of TS_EXTENSIONS) {
    if (fs.existsSync(`${candidate}${ext}`)) {
      return true;
    }
  }

  return false;
}

function validatePathEntries(resolvedBaseUrl, paths, messages) {
  const errors = [];

  Object.entries(paths).forEach(([aliasKey, aliasValue]) => {
    if (!Array.isArray(aliasValue) || aliasValue.length === 0) {
      errors.push(
        `Path alias '${aliasKey}' must map to a non-empty array of paths.`
      );
      return;
    }

    const aliasWildcardCount = normalizeWildcardCount(aliasKey);

    if (aliasWildcardCount > 1) {
      errors.push(
        `Path alias '${aliasKey}' may contain at most one wildcard ('*').`
      );
      return;
    }

    aliasValue.forEach((targetPath) => {
      if (typeof targetPath !== 'string' || targetPath.trim().length === 0) {
        errors.push(
          `Path alias '${aliasKey}' contains an invalid target path.`
        );
        return;
      }

      const targetWildcardCount = normalizeWildcardCount(targetPath);

      if (aliasWildcardCount !== targetWildcardCount) {
        errors.push(messages.mismatch(aliasKey, targetPath));
        return;
      }

      const candidate = targetPath.replace('*', '');
      const resolvedTarget = path.resolve(resolvedBaseUrl, candidate);

      if (!existsPathCandidate(resolvedTarget)) {
        errors.push(messages.missing(aliasKey, resolvedTarget));
      }
    });
  });

  return errors;
}

// Strict validator: requires baseUrl, uses original error phrasing.
function validateTsconfigPaths(tsconfigPath) {
  const errors = [];
  const tsconfig = loadTsconfig(tsconfigPath);
  const compilerOptions = tsconfig.compilerOptions;

  if (!compilerOptions || typeof compilerOptions !== 'object') {
    errors.push('Missing or invalid compilerOptions in tsconfig.');
    return { errors };
  }

  const paths = compilerOptions.paths;
  if (!paths || typeof paths !== 'object') {
    return { errors };
  }

  const tsconfigDir = path.dirname(tsconfigPath);
  const baseUrl = compilerOptions.baseUrl;

  if (!baseUrl || typeof baseUrl !== 'string') {
    errors.push('compilerOptions.baseUrl is required when using path aliases.');
    return { errors };
  }

  const resolvedBaseUrl = path.resolve(tsconfigDir, baseUrl);
  if (!fs.existsSync(resolvedBaseUrl)) {
    errors.push(
      `compilerOptions.baseUrl does not exist at ${resolvedBaseUrl}.`
    );
    return { errors };
  }

  const messages = {
    mismatch: (key, target) =>
      `Alias pattern mismatch: '${key}' -> '${target}'. Both must have the same number of '*'`,
    missing: (key, resolved) =>
      `Path alias '${key}' maps to a missing path: ${resolved}`,
  };

  errors.push(...validatePathEntries(resolvedBaseUrl, paths, messages));
  return { errors };
}

// Lenient validator: baseUrl optional (falls back to tsconfig dir), clearer messages.
function validatePathAliases(tsconfigPath) {
  const tsconfig = loadTsconfig(tsconfigPath);
  const compilerOptions = tsconfig.compilerOptions || {};
  const paths = compilerOptions.paths;

  if (!paths || typeof paths !== 'object') {
    return [];
  }

  const tsconfigDir = path.dirname(tsconfigPath);
  const baseUrl = compilerOptions.baseUrl;
  const resolvedBaseUrl =
    baseUrl && typeof baseUrl === 'string'
      ? path.resolve(tsconfigDir, baseUrl)
      : tsconfigDir;

  const messages = {
    mismatch: (key, target) =>
      `Alias pattern mismatch: '${key}' -> '${target}'. Both must have the same number of '*'`,
    missing: (key, resolved) =>
      `Path alias '${key}' does not resolve to an existing file or directory: ${resolved}`,
  };

  return validatePathEntries(resolvedBaseUrl, paths, messages);
}

function run() {
  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    console.error(`Could not locate tsconfig.json at ${tsconfigPath}`);
    process.exit(1);
  }

  const { errors } = validateTsconfigPaths(tsconfigPath);

  if (errors.length > 0) {
    console.error('Path alias validation failed:');
    errors.forEach((error, i) => console.error(`${i + 1}. ${error}`));
    process.exit(1);
  }

  console.log('Path alias validation succeeded.');
}

if (require.main === module) {
  run();
}

module.exports = {
  validateTsconfigPaths,
  validatePathAliases,
  loadTsconfig,
};
