#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

function loadTsconfig(tsconfigPath) {
  const fileContents = fs.readFileSync(tsconfigPath, 'utf8');
  return JSON.parse(fileContents);
}

function normalizeWildcardCount(value) {
  return (value.match(/\*/g) || []).length;
}

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
    errors.push(`compilerOptions.baseUrl does not exist at ${resolvedBaseUrl}.`);
    return { errors };
  }

  const aliasKeys = Object.keys(paths);
  if (aliasKeys.length === 0) {
    return { errors };
  }

  aliasKeys.forEach((aliasKey) => {
    const aliasValue = paths[aliasKey];
    if (!Array.isArray(aliasValue) || aliasValue.length === 0) {
      errors.push(`Path alias '${aliasKey}' must map to a non-empty array of paths.`);
      return;
    }

    const aliasWildcardCount = normalizeWildcardCount(aliasKey);
    if (aliasWildcardCount > 1) {
      errors.push(`Path alias '${aliasKey}' may contain at most one wildcard ('*').`);
      return;
    }

    aliasValue.forEach((targetPath) => {
      if (typeof targetPath !== 'string' || targetPath.trim().length === 0) {
        errors.push(`Path alias '${aliasKey}' contains an invalid target path.`);
        return;
      }

      const targetWildcardCount = normalizeWildcardCount(targetPath);
      if (aliasWildcardCount !== targetWildcardCount) {
        errors.push(
          `Wildcard count mismatch for alias '${aliasKey}': target path '${targetPath}' must ${
            aliasWildcardCount ? 'include' : 'not include'
          } a wildcard.
        `);
        return;
      }

      if (aliasWildcardCount > 1 || targetWildcardCount > 1) {
        errors.push(`Only one wildcard ('*') is allowed per alias or target path. Found '${aliasKey}' -> '${targetPath}'.`);
        return;
      }

      const candidate = targetPath.replace('*', '');
      const resolvedTarget = path.resolve(resolvedBaseUrl, candidate);

      if (!fs.existsSync(resolvedTarget)) {
        errors.push(`Path alias '${aliasKey}' maps to a missing path: ${resolvedTarget}`);
        return;
      }
    });
  });

  return { errors };
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
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('Path alias validation succeeded.');
}

if (require.main === module) {
  run();
}

module.exports = {
  validateTsconfigPaths,
  loadTsconfig,
};
