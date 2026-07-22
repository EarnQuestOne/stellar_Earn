import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

const { validatePathAliases } =
  await import('../../scripts/validate-path-aliases.js');

const packageRoot = path.resolve(__dirname, '../../');

test('current frontend tsconfig alias configuration validates successfully', () => {
  const tsconfigPath = path.join(packageRoot, 'tsconfig.json');
  const errors = validatePathAliases(tsconfigPath);
  expect(errors).toHaveLength(0);
});

test('invalid alias target path is reported clearly', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alias-validation-'));
  const tsconfigPath = path.join(tempDir, 'tsconfig.json');
  const tsconfig = {
    compilerOptions: {
      paths: {
        '@/*': ['./missing/*'],
      },
    },
  };

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  const errors = validatePathAliases(tsconfigPath);

  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain(
    'does not resolve to an existing file or directory'
  );
});

test('wildcard mismatch between alias and target is reported', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alias-validation-'));
  const tsconfigPath = path.join(tempDir, 'tsconfig.json');
  const tsconfig = {
    compilerOptions: {
      paths: {
        '@/*': ['./'],
      },
    },
  };

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  const errors = validatePathAliases(tsconfigPath);

  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('Alias pattern mismatch');
});
