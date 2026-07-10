const {
  runAll: runOrphanedScriptTests,
} = require("./check-orphaned-scripts.test");
const {
  runAll: runContractChangelogDisciplineTests,
} = require("./check-contract-changelog-discipline.test");
const {
  runAll: runLintStagedConfigTests,
} = require("./lint-staged-config.test");
const { runAll: runPreCommitHookTests } = require("./pre-commit-hook.test");
const { runAll: runReleasePackageTests } = require("./contract-release-package.test");
const {
  runAll: runBackendChangelogTests,
} = require("./backend-changelog.test");

try {
  runOrphanedScriptTests();
  runContractChangelogDisciplineTests();
  runLintStagedConfigTests();
  runPreCommitHookTests();
  runReleasePackageTests();
  runBackendChangelogTests();
  console.log("All tests passed");
  process.exit(0);
} catch (e) {
  console.error("Tests failed:", e && e.stack ? e.stack : e);
  process.exit(1);
}
