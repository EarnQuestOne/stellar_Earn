const path = require("path");

const FRONTEND_DIR = "FrontEnd/my-app";
const BACKEND_DIR = "BackEnd";

function buildCommands(cwd, command, files) {
  if (files.length === 0) {
    return [];
  }

  // Use --prefix instead of changing directories to be compatible with
  // Windows/git-hook environments where `cd` may fail.
  // Note: npx --prefix does NOT change the working directory, so we must
  // pass the absolute paths (or paths relative to root) to the command.
  const escapedFiles = files.map((file) => `"${file.replace(/\\/g, "/")}"`);
  return [`npx --prefix ${cwd} ${command} ${escapedFiles.join(" ")}`];
}

function buildNpmScript(cwd, scriptName, files) {
  const relativeFiles = files.map((file) =>
    path.relative(cwd, file).replace(/\\/g, "/"),
  );
  if (relativeFiles.length === 0) return [];
  return [
    `npm --prefix ${cwd} run ${scriptName} -- --fix ${relativeFiles.join(" ")}`,
  ];
}

/** @type {import('lint-staged').Configuration} */
module.exports = {
  "FrontEnd/my-app/**/*.{js,jsx,ts,tsx,css,scss,md,json,yml,yaml}": (files) => [
    ...buildCommands(FRONTEND_DIR, "prettier --write", files),
    ...buildNpmScript(FRONTEND_DIR, "lint", files),
  ],
  "BackEnd/{src,test}/**/*.ts": (files) => [
    ...buildCommands(BACKEND_DIR, "prettier --write", files),
    ...buildNpmScript(BACKEND_DIR, "lint", files),
  ],
  "BackEnd/**/*.json": (files) =>
    buildCommands(BACKEND_DIR, "prettier --write", files),
  "{scripts,tests}/**/*.{js,mjs,cjs,json,md,yml,yaml}": (files) => [
    `npx prettier --write ${files.map((file) => file.replace(/\\/g, "/")).join(" ")}`,
  ],
};
