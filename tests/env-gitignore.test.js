const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function testGitignoreListsEnv() {
  assert.match(read(".gitignore"), /^\*\*\/\.env$/m);
  assert.match(read(".gitignore"), /^\*\*\/\.env\.\*$/m);
  assert.match(read(".gitignore"), /^!\*\*\/\.env\.example$/m);

  assert.match(read("BackEnd/.gitignore"), /^\.env$/m);
  assert.match(read("BackEnd/.gitignore"), /^\.env\.\*$/m);
  assert.match(read("BackEnd/.gitignore"), /^!\.env\.example$/m);

  assert.match(read("FrontEnd/my-app/.gitignore"), /^\.env\*/m);
  assert.match(read("FrontEnd/my-app/.gitignore"), /^!\.env\.example$/m);

  assert.match(read("subgraph/.gitignore"), /^\.env$/m);
}

function testEnvPathsAreIgnored() {
  const paths = [
    ".env",
    "BackEnd/.env",
    "BackEnd/.env.local",
    "BackEnd/.env.production",
    "FrontEnd/my-app/.env",
    "subgraph/.env",
  ];
  for (const envPath of paths) {
    try {
      git(["check-ignore", "-q", envPath]);
    } catch {
      assert.fail(`${envPath} is not gitignored`);
    }
  }
}

function testNoTrackedDotEnvFiles() {
  const files = git(["ls-files"])
    .split(/\r?\n/)
    .filter(Boolean);
  const leaked = files.filter((file) => {
    const base = file.split(/[/\\]/).pop();
    return (
      base === ".env" || (base.startsWith(".env.") && base !== ".env.example")
    );
  });
  assert.deepStrictEqual(
    leaked,
    [],
    `tracked dotenv files are not allowed: ${leaked.join(", ")}`,
  );
}

function testEnvExampleStaysTracked() {
  const files = new Set(
    git(["ls-files"])
      .split(/\r?\n/)
      .filter(Boolean),
  );
  assert.ok(files.has("BackEnd/.env.example"));
  assert.ok(files.has("FrontEnd/my-app/.env.example"));
  assert.ok(files.has("subgraph/.env.example"));
}

function testSecretScanAssetsExist() {
  assert.ok(fs.existsSync(path.join(ROOT, ".gitleaks.toml")));
  assert.ok(fs.existsSync(path.join(ROOT, "scripts", "secret-scan.sh")));
  assert.ok(
    fs.existsSync(path.join(ROOT, ".github", "workflows", "secret-scan.yml")),
  );
  const workflow = read(".github/workflows/secret-scan.yml");
  assert.match(workflow, /gitleaks/);
  assert.match(workflow, /secret-scan\.sh/);
}

function runAll() {
  testGitignoreListsEnv();
  testEnvPathsAreIgnored();
  testNoTrackedDotEnvFiles();
  testEnvExampleStaysTracked();
  testSecretScanAssetsExist();
}

module.exports = { runAll };
