const assert = require('assert');
const {
  buildUnreleasedBody,
  evaluateBackendChangelogDiscipline,
  getAffectedModules,
  groupCommitsByModule,
  isImplementationFile,
  moduleOf,
  parseConventionalCommits,
  upsertUnreleased,
  changelogPathForModule,
} = require('../scripts/backend-changelog');

function testIsImplementationFile() {
  assert.strictEqual(isImplementationFile('BackEnd/src/modules/auth/auth.service.ts'), true);
  assert.strictEqual(isImplementationFile('BackEnd/src/modules/auth/auth.service.spec.ts'), false);
  assert.strictEqual(isImplementationFile('BackEnd/src/modules/auth/CHANGELOG.md'), false);
  assert.strictEqual(isImplementationFile('BackEnd/src/common/logger.ts'), false);
  assert.strictEqual(isImplementationFile('README.md'), false);
}

function testModuleOf() {
  assert.strictEqual(moduleOf('BackEnd/src/modules/submissions/dto/x.ts'), 'submissions');
  assert.strictEqual(moduleOf('FrontEnd/app.tsx'), null);
}

function testGetAffectedModules() {
  const files = [
    'BackEnd/src/modules/auth/auth.service.ts',
    'BackEnd/src/modules/quests/quests.controller.ts',
    'BackEnd/src/modules/auth/auth.module.ts',
    'README.md',
  ];
  assert.deepStrictEqual(getAffectedModules(files), ['auth', 'quests']);
}

function testSkipsWhenNoModuleChanges() {
  const result = evaluateBackendChangelogDiscipline({ changedFiles: ['README.md'] });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.details.checked, false);
}

function testRequiresChangelogWhenModuleChanges() {
  const result = evaluateBackendChangelogDiscipline({
    changedFiles: ['BackEnd/src/modules/auth/auth.service.ts'],
    commitMessages: 'feat(auth): add refresh tokens',
  });
  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.includes(
      `Changes to the "auth" module require an update to ${changelogPathForModule('auth')} in the same PR.`,
    ),
  );
}

function testPassesWithModuleChangelogUpdate() {
  const result = evaluateBackendChangelogDiscipline({
    changedFiles: [
      'BackEnd/src/modules/auth/auth.service.ts',
      'BackEnd/src/modules/auth/CHANGELOG.md',
    ],
    commitMessages: 'feat(auth): add refresh tokens',
  });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.details.breakingSignal, false);
}

function testBreakingRequiresMetadataAndFooter() {
  const result = evaluateBackendChangelogDiscipline({
    changedFiles: [
      'BackEnd/src/modules/auth/auth.service.ts',
      'BackEnd/src/modules/auth/CHANGELOG.md',
    ],
    // Breaking footer present but no `type(scope)!:` metadata.
    commitMessages: 'feat(auth): rework sessions\n\nBREAKING CHANGE: tokens rotate',
    prTitle: 'feat(auth): rework sessions',
  });
  assert.strictEqual(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes('Conventional Commit breaking metadata')),
  );
}

function testParseConventionalCommits() {
  const log = [
    'feat(auth): add login\n\nbody',
    '---END---',
    'fix(quests): correct reward calc',
    '---END---',
    'chore: tidy repo',
    '---END---',
    'refactor(auth)!: drop legacy guard\n\nBREAKING CHANGE: removed',
    '---END---',
  ].join('\n');
  const commits = parseConventionalCommits(log);
  assert.strictEqual(commits.length, 4);
  assert.strictEqual(commits[0].scope, 'auth');
  assert.strictEqual(commits[3].breaking, true);
}

function testGroupCommitsByModule() {
  const commits = parseConventionalCommits(
    'feat(auth): a\n---END---\nfix(quests): b\n---END---\nchore: c\n---END---',
  );
  const { byModule, unscoped } = groupCommitsByModule(commits, ['auth', 'quests']);
  assert.deepStrictEqual(Object.keys(byModule).sort(), ['auth', 'quests']);
  assert.strictEqual(unscoped.length, 1);
}

function testBuildUnreleasedBody() {
  const commits = parseConventionalCommits(
    'feat(auth): add login\n---END---\nfix(auth): patch leak\n---END---',
  );
  const body = buildUnreleasedBody(commits);
  assert.ok(body.includes('### Added'));
  assert.ok(body.includes('- add login'));
  assert.ok(body.includes('### Fixed'));
  assert.ok(body.includes('- patch leak'));
}

function testUpsertUnreleased() {
  const original = '# auth module changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2025-01-01\n\n### Added\n- initial\n';
  const merged = upsertUnreleased(original, '### Added\n- add login');
  assert.ok(merged.includes('## [Unreleased]'));
  assert.ok(merged.includes('- add login'));
  assert.ok(merged.includes('## [1.0.0] - 2025-01-01'));
  // Older release content is preserved.
  assert.ok(merged.includes('- initial'));
}

function runAll() {
  testIsImplementationFile();
  testModuleOf();
  testGetAffectedModules();
  testSkipsWhenNoModuleChanges();
  testRequiresChangelogWhenModuleChanges();
  testPassesWithModuleChangelogUpdate();
  testBreakingRequiresMetadataAndFooter();
  testParseConventionalCommits();
  testGroupCommitsByModule();
  testBuildUnreleasedBody();
  testUpsertUnreleased();
  console.log('backend-changelog tests passed');
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
