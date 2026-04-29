# Replayable case study (public checklist)

This folder documents how a third party can reproduce the same gates the maintainers run, without relying on private notes or chat logs.

For a pinned real-repository dry-run narrative, see [EXTERNAL.md](EXTERNAL.md).

## What “replay” means here

1. Clone this repository at a known revision (use the commit SHA printed by `git rev-parse HEAD` after you update).
2. Install dependencies with a clean `npm ci`.
3. Run the exact commands in `baseline-commands.txt` and capture stdout/stderr plus exit codes.
4. Optional: run the migration pipeline in dry-run against a throwaway copy of a Solana repo that still imports `@solana/web3.js`.

## Fixed command bundle

See `baseline-commands.txt` in this directory for the canonical list (also mirrored from root `npm` scripts).

## Regenerate committed report samples

From the repository root (after `npm ci`):

```bash
npm run case-study:replay
```

This writes `artifacts/dry-run.report.json` (target path redacted to `<temporary-sample-target>`) and `artifacts/dry-run.summary.json` produced from a disposable temp project that imports `@solana/web3.js`. Commit the updated JSON when report schema or pipeline behavior changes materially.

## Optional: before / after branch recipe

For a public before/after narrative, maintainers can publish two tags on the same sample repo (not this tool repo), for example:

- `case-study/before-web3-v1` — sample app with only `@solana/web3.js`.
- `case-study/after-compat-pilot` — same app after `node …/migration-pipeline.mjs --target … --apply` plus recorded validation.

Record in your PR or release notes:

- `git rev-parse HEAD` for the sample repo at each tag.
- The exact `node …/migration-pipeline.mjs` invocation (dry-run and apply).
- Exit codes from `npm test` / `npm run build` (or your project equivalents) before and after.

## Evidence bundle (minimal)

When filing a hackathon submission, attach or link:

- CI run URL for the tool repo at the submitted commit.
- The JSON report path from a dry-run (`solana-compat-pilot-report.json`) with sensitive paths redacted if needed.
