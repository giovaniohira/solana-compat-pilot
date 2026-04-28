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
npm test
npx codemod workflow validate -w workflow.yaml
npx codemod workflow run -w workflow.yaml -t /path/to/solana-project --allow-dirty --no-interactive
```

Recommended pipeline:

```bash
# Dry-run: no target files changed, report written in the target repo.
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --dry-run

# Apply deterministic changes and produce a rollback patch.
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --apply

# Apply, refresh lockfile, and run target validation commands.
node ./scripts/migration-pipeline.mjs --target /path/to/solana-project --apply --install --check "npm test" --check "npm run build"
```

The apply report includes:

- package manifest changes,
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
  `@solana/client` when `@solana/web3.js` is present.
- Dry-run JSON report, confidence buckets, validation command hooks, and git
  rollback patch.
- Review markers for full-Kit migration hotspots.

Not automated yet:

- `new Connection(...)` to `createSolanaRpc(...)`.
- `new PublicKey(...)` to `address(...)`.
- `Keypair` to async Kit signer APIs.
- Mutable `Transaction` builders to Kit transaction-message pipelines.

Those patterns require project-specific semantics and are intentionally left for
the bounded AI/manual phase until fixtures prove zero-false-positive handling.
