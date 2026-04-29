# Validation Report

## Local Quality Gates After Remediation

Commands:

```bash
npm run ci
```

Results:

- JSSG fixtures: 13 passed, 0 failed.
- Pipeline unit tests: 22 passed, 0 failed.
- Workflow validation: passed.
- Typecheck: passed.
- Dependency audit from `npm install`: 0 vulnerabilities.

GitHub Actions parity:

- `.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`, `npm test`,
  `npm run validate`, and `npm run audit` (same gates as `npm run ci`,
  with install separated into its own step).

Fixture coverage:

- ESM import source rewrite with `Connection` and `PublicKey` markers.
- CommonJS `require` source rewrite with `Keypair` and `Transaction` markers.
- Negative local `PublicKey` file remains unchanged.
- Namespace imports, aliases, type-only imports, dynamic imports,
  `import = require`, comments/strings, existing markers, mixed packages,
  single quotes, and safe no-marker files.

## Real-Repo Smoke Run After Remediation

Target:

- Repository: `captainlee1024/solana-web3js-tutorials`
- Location: temporary clone outside this repo.

Command:

```bash
node ./scripts/migration-pipeline.mjs --target <temp>/solana-compat-pilot-validation --dry-run --report <temp>/dry-run-report.json
node ./scripts/migration-pipeline.mjs --target <temp>/solana-compat-pilot-validation --apply --report <temp>/apply-report.json
```

Result:

- Dry-run report completed without modifying target files.
- Apply report completed successfully.
- 30 TypeScript files changed.
- `package.json` changed with 3 added Solana bridge dependencies.
- Diff stat: 148 insertions, 30 deletions.
- Every changed file had the legacy import source rewritten to
  `@solana/web3-compat`.
- Hotspot markers were inserted where full-Kit migration review is required.
- Rollback patch was emitted.

Representative diff:

```diff
-import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
+// SOLANA_COMPAT_PILOT: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:
+// - new PublicKey: PublicKey can sometimes become address(), but object-method call sites may still need compat.
+
+import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3-compat';
```

## Known Gaps

- Dynamic `import("@solana/web3.js")` is supported by the package-source
  rewrite fixture.
- `package.json` dependency changes are automated by the pipeline runner.
- Direct Kit rewrites are limited to three opt-in transforms:
  `public-key-literals`, `connection-string-literals`, and
  `websocket-connection-literals`.
- Full direct Kit transforms are intentionally not implemented until each
  pattern has fixtures and real-repo proof.

## Hostile Review After Initial Baseline

The initial baseline was not a winning system. It had three passing fixtures and
only rewrote import/require source strings. The docs overstated maturity by
presenting council scores that were not supported by implementation evidence.

Critical gaps identified:

- No manifest migration.
- No rollback path.
- No dry-run report or machine-readable confidence output.
- No CI.
- Tiny fixture set.
- No reproducible target build/test gate.
- No direct Kit transform with proof.

## Remediation Status

Fixed in the remediation slice:

- Added manifest migration for `@solana/web3-compat`, `@solana/kit`, and
  `@solana/client`.
- Added dry-run/apply runner with JSON report and confidence buckets.
- Added git rollback patch generation.
- Added validation command hooks.
- Expanded JSSG fixtures from 3 to 13.
- Added pipeline unit tests.
- Added CI gates for tests, workflow validation, and audit.
- Removed inflated score language from user-facing docs.
- Added dirty-target refusal by default in apply mode.
- Added opt-in direct Kit transforms for safe `PublicKey` string literals and
  safe `Connection` string-literal endpoints (HTTP/S and WebSocket).

Still missing:

- Broader direct Kit transforms with enough proof to claim meaningful full
  migration coverage.
- Reproducible public case-study branch with before/after commits and target
  build/test logs.
- Lockfile refresh automation is available through `--install`, but lockfile
  edits are not synthesized manually.
