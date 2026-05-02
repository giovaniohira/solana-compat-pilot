# Judge reproduction — under five minutes

Use this path if you only want **evidence**, not a full migration apply.

## A — Prove the codemod package is real (no clone)

Open the registry listing (version, README, **npx** tab with copy-to-clipboard):  
https://app.codemod.com/registry/solana-compat-pilot

## B — Prove tests and workflow are green (clone once)

```bash
git clone https://github.com/giovaniohira/solana-compat-pilot.git
cd solana-compat-pilot
npm ci
npm run ci
```

Expect: **50** JSSG fixture tests, **22** pipeline tests, workflow validate, typecheck, audit — all green.

## C — Prove deterministic behavior on fixtures only

```bash
npx codemod jssg test -l tsx ./solana-compat-pilot.codemod.ts ./tests
```

## D — Prove operator pipeline on a throwaway folder

Use **Git Bash or WSL** on Windows (paths below are Unix-style).

```bash
mkdir -p /tmp/solana-judge-target/src
printf '%s\n' 'import { Connection } from "@solana/web3.js";' > /tmp/solana-judge-target/src/app.ts
printf '%s\n' '{"name":"judge","dependencies":{"@solana/web3.js":"^1.0.0"}}' > /tmp/solana-judge-target/package.json
cd /path/to/solana-compat-pilot
node ./scripts/migration-pipeline.mjs --target /tmp/solana-judge-target --dry-run --report /tmp/solana-judge-target/report.json
node ./scripts/migration-score.mjs /tmp/solana-judge-target/report.json
```

Expect: report JSON written; target sources unchanged in `--dry-run`; score stdout with bounded fields.

## E — Real OSS corpus (optional, longer)

Follow pinned SHAs and commands in [`../case-study/EXTERNAL.md`](../case-study/EXTERNAL.md) for `solana-labs/explorer` and `solana-labs/solana-program-library` / `token/js`.
