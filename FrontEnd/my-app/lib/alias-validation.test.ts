import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const { validateTsconfigPaths } = require('../scripts/validate-path-aliases');

function createTempProject(tsconfigContents: object) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alias-validation-'));
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify(tsconfigContents, null, 2));
  return root;
}

function cleanupDirectory(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('validateTsconfigPaths', () => {
  it('succeeds when configured aliases map to existing paths', () => {
    const projectRoot = createTempProject({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['./*'],
        },
      },
    });

    const result = validateTsconfigPaths(path.join(projectRoot, 'tsconfig.json'));
    cleanupDirectory(projectRoot);

    expect(result.errors).toHaveLength(0);
  });

  it('fails when alias target path does not exist', () => {
    const projectRoot = createTempProject({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['./missing/*'],
        },
      },
    });

    const result = validateTsconfigPaths(path.join(projectRoot, 'tsconfig.json'));
    cleanupDirectory(projectRoot);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('maps to a missing path');
  });

  it('fails when baseUrl is missing but path aliases are configured', () => {
    const projectRoot = createTempProject({
      compilerOptions: {
        paths: {
          '@/*': ['./*'],
        },
      },
    });

    const result = validateTsconfigPaths(path.join(projectRoot, 'tsconfig.json'));
    cleanupDirectory(projectRoot);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('compilerOptions.baseUrl is required');
  });
});
