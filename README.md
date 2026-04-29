# Solana Compat Pilot

Solana Compat Pilot is a conservative Codemod/JSSG migration package for moving
`@solana/web3.js` v1 projects onto the `@solana/web3-compat` bridge and preparing
them for progressive `@solana/kit` adoption.

The goal is not to guess through hard semantic rewrites. The deterministic pass
handles changes that are safe at scale, while risky full-Kit migrations are
reported with clear AI/human follow-up instructions.

## What It Does Now

- Automates the low-risk bridge step for real Solana projects.
- Minimizes false positives by only touching files that import or require
  `@solana/web3.js`.
- Leaves review markers for complex migration areas such as `Connection`,
  `PublicKey`, `Keypair`, mutable transactions, and subscriptions.
- Provides a runner that can analyze a target repo, update `package.json`, run
  the Codemod workflow, write a JSON confidence report, and emit a rollback
  patch for git-backed targets.

## Usage

```bash
npm install
npm run typecheck
npm test
npx codemod workflow validate -w workflow.yaml
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --dry-run
```

Replayable public evidence for judges is documented under `case-study/` (command checklist, `npm run case-study:replay`, committed `case-study/artifacts/*.json` samples, and pinned real-repo notes in [`case-study/EXTERNAL.md`](case-study/EXTERNAL.md)).

Pinned replay references in this repository are currently anchored at pilot commit `c46d591f4f80d9cd88fe2331c702975a93e2afc9` and target-repo commit(s) listed in `case-study/EXTERNAL.md`.

The migration runner is split under `scripts/pipeline/` (scan/manifest/direct Kit/report/rollback) so the CLI entry `scripts/migration-pipeline.mjs` stays a thin orchestrator.

Recommended pipeline:

```bash
# Dry-run: no target files changed, report written in the target repo.
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --dry-run

# Apply deterministic changes and produce a rollback patch (requires validation checks).
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --apply --check "npm test"

# Apply with opt-in direct Kit transforms (repeat `--direct-kit` per transform).
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --apply --check "npm test" --direct-kit public-key-literals --direct-kit connection-string-literals --direct-kit websocket-connection-literals

# Apply, refresh lockfile, and run target validation commands.
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --apply --install --check "npm test" --check "npm run build"
```

Apply mode refuses dirty git targets by default. Pass `--allow-dirty` only when
the target has intentional uncommitted changes and the rollback patch is enough
for the run.

Apply mode also requires at least one `--check` command by default so applies are
always tied to a real target validation gate. Use `--skip-validation` only when
you explicitly accept an unverified apply (for example in throwaway sandboxes).

Dry-run and report scans exclude common test and fixture directories (`tests/`,
`__tests__/`, `fixtures/`, `*.test.*`, `*.spec.*`, `.cursor/`, and similar) so
counts reflect product source. Pass `--include-test-dirs` to scan them anyway,
and `--exclude-glob` (repeatable) to add project-specific exclusions.

The apply report includes:

- package manifest changes,
- opt-in direct Kit transform changes,
- changed source confidence buckets,
- exact hotspots that still need review,
- validation command results,
- rollback command for git targets.

## Current Scope

Automated:

- ESM imports from `@solana/web3.js` to `@solana/web3-compat`.
- CommonJS `require("@solana/web3.js")` to `@solana/web3-compat`.
- Dynamic `import("@solana/web3.js")` to `@solana/web3-compat`.
- `import x = require("@solana/web3.js")` to `@solana/web3-compat`.
- `package.json` additions for `@solana/web3-compat`, `@solana/kit`, and
  `@solana/client` for every scanned workspace manifest (root plus `packages/*`-style folders
  resolved from npm `workspaces` and from `pnpm-workspace.yaml`).
- Opt-in direct Kit rewrites (`--direct-kit`):
  - unaliased `new PublicKey("<literal>")` when the imported `PublicKey` is only
    used for string-literal constructors and the constructed values are not used
    through legacy object/member APIs (`address` from `@solana/kit`);
  - unaliased `new Connection("<http(s) RPC URL>")` when the compat `Connection` import matches
    the narrow constructor-only pattern (`createSolanaRpc` from `@solana/kit`).
  - unaliased `new Connection("<ws:// or wss:// URL>")` with the same safety rules
    (`createSolanaRpcSubscriptions` from `@solana/kit`; opt-in `websocket-connection-literals`).
- Dry-run JSON report, confidence buckets, validation command hooks, and git
  rollback patch.
- Review markers for full-Kit migration hotspots.

Additional automation gaps (still manual / AI review):

- `new Connection` / `PublicKey` / `Keypair` cases outside the guarded literal patterns above.

Not automated yet (semantic / async boundary changes):

`Keypair`-style flows to Kit signers (`generateKeyPair` is async unlike `Keypair.generate()`).
Mutable `Transaction` builders to Kit transaction-message pipelines.

Those patterns remain for project-specific review (`SOLANA_COMPAT_PILOT` markers plus optional bounded Codemod AI step in `workflow.yaml`, which CI does **not** execute).

## Migration score meaning

The headline score produced by `scripts/migration-score.mjs` is a file-level coverage ratio:
`safeFilesCoveragePercent = safeFiles / legacyFilesBefore` (rounded to two decimals).
It is **not** "% of the whole codebase migrated to Kit" and should be read together with
the `needs-review` hotspot list. Formula details are documented in
[`case-study/migration-score.md`](case-study/migration-score.md).

