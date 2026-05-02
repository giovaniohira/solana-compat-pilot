# Validation Report

## Local quality gates (current)

Commands:

```bash
npm run ci
```

Results (representative run):

- JSSG fixtures: **20** passed, 0 failed.
- Pipeline integration tests: **22** passed, 0 failed.
- Workflow validation: passed.
- Typecheck: passed.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.

GitHub Actions parity:

- `.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`, `npm test`,
  `npm run validate`, and `npm run audit` (same gates as `npm run ci`,
  with install separated into its own step).

Fixture coverage (high level):

- ESM / CJS / dynamic / `import = require` / **`export {…} from` / `export * from`** module string rewrites for `@solana/web3.js` → `@solana/web3-compat`.
- Hotspot markers for `Connection`, `PublicKey`, `Keypair`, `Transaction`, subscriptions, `sendAndConfirmTransaction` where patterns appear in source.
- Negative: files without legacy package, mixed packages, comments/strings, type-only imports, existing markers, RPC member guards for Connection, object API guards for PublicKey literal transform, etc.

## Real-repo smoke run (archived narrative)

Earlier ad-hoc apply experiments were documented in git history. **Canonical** replay evidence is under **`case-study/EXTERNAL.md`**, **`case-study/REPLAY.md`**, and **`case-study/artifacts/*.json`**.

## Known gaps (honest scope)

- Full semantic Kit migration (async `Keypair` → signers, mutable `Transaction` pipelines) is **explicitly out of scope** for deterministic automation; markers + optional bounded AI step document the path.
- Direct Kit rewrites are limited to **three** opt-in transforms with fixtures: `public-key-literals`, `connection-string-literals`, `websocket-connection-literals`.
- Apply on huge monorepos still requires project-specific `--check` commands; the tool enforces that you attach real validation.

## Remediation status

Shipped in this repository:

- Manifest migration for compat + Kit + client deps across npm/pnpm workspaces.
- Dry-run / apply runner with JSON report, migration score, rollback patch, dirty-git refusal.
- Expanded JSSG corpus with negative and edge cases (**20** pairs).
- CI gates and Codemod registry distribution (`npx codemod solana-compat-pilot`).
