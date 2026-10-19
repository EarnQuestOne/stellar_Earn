# Frontend Build Reproducibility Policy

This policy defines how the StellarEarn frontend is built so that the same
source revision produces the same output across developer machines and CI. It
applies to the Next.js application in `FrontEnd/my-app`, its dependency graph,
the build environment, and any packaged artifact published from a build.

- **Owner:** Frontend maintainers, with the platform team as co-owner
- **Review cadence:** every 6 months
- **Status:** Active
- **Related:** [Dependency policy](../DEPENDENCY_POLICY.md), [CI/CD policy](../CICD_POLICY.md), [Container image policy](../backend/CONTAINER_IMAGE.md), [Release policy](../RELEASE_POLICY.md)

## Pinned inputs

A reproducible build pins every input that can change the output:

| Input | Requirement |
|-------|-------------|
| Node.js | The major version is pinned in the repository and in CI; upgrades are a reviewed change |
| Package manager | The version is pinned and recorded with the project |
| Dependencies | `package-lock.json` is committed and installed with `npm ci`; ad-hoc installs are not used in CI |
| Build configuration | Next.js, TypeScript, PostCSS, and ESLint configuration files are version-controlled |
| Environment | Build-time environment variables are explicit, documented, and injected from the CI environment, never from a developer's shell |
| Container base image | Pinned by digest when the build runs in a container |
| Fonts and static assets | Vendored or fetched through a pinned, recorded source; no unversioned remote downloads during build |
| Randomness | Build output must not depend on the current time, random IDs, or machine-specific paths |

## Build rules

- CI runs `npm ci`, not `npm install`, and fails if the lockfile and
  `package.json` disagree.
- Builds must not require network access beyond the package registry and the
  explicitly approved asset sources. A build that fetches arbitrary remote
  content is not reproducible and is rejected.
- Secrets are never build inputs. Public configuration is passed explicitly and
  recorded in the build metadata.
- The build directory is cleaned before compilation (`prebuild`), and generated
  files are not committed unless a documented tool requires them.
- Source maps are produced deterministically and stored with the artifact or
  uploaded to the approved error-monitoring service.
- File timestamps and absolute paths must not appear in emitted bundles. Where a
  tool embeds a timestamp, the build sets it from the source commit or
  `SOURCE_DATE_EPOCH`.

## Verification

- CI builds the same commit twice in a clean environment and compares the
  produced asset manifest and file hashes. A mismatch fails the pipeline.
- The build records the resolved dependency tree, Node version, lockfile hash,
  source commit, and build command in a metadata file.
- Deployments use the artifact produced by the verified CI build; local builds
  are for development only and are never promoted.
- A dependency or toolchain change that alters the output hash is reviewed as a
  build change, not as an unrelated routine bump.

## Lockfile and dependency changes

- Lockfile changes are reviewed for unexpected new packages, registry changes,
  and version ranges that drift from the declared policy.
- Dependencies are added under [Dependency policy](../DEPENDENCY_POLICY.md), and
  a change that requires a new native tool must update this policy.
- Renovation and automated bump pull requests must pass the dual-build
  verification before merge.

## Ownership and review

The frontend maintainers own the build configuration; the platform team owns the
CI runners and artifact storage. The policy is reviewed every six months and
whenever the Node version, package manager, build framework, or hosting platform
changes.

## Amendments

Changes follow [AMENDMENTS.md](../AMENDMENTS.md) and are made by pull request
limited to the `Governance/` folder.
