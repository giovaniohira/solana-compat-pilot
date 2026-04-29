# External real-repo evidence (replayable)

This complements the synthetic temp-project replay (`REPLAY.md` + `artifacts/`).

## Chosen pinned target — `solana-labs/explorer`

Representative OSS production app using `@solana/web3.js` at scale (pnpm, Next.js).

| Field | Value |
| --- | --- |
| Repo | `https://github.com/solana-labs/explorer` |
| **Before** pinned ref | **`0c71e7272ef8eb1a72a9b2b16c5cd2056b6d5c63`** (`HEAD` at capture time — re-verify with `git rev-parse HEAD` after cloning) |
| Pilot tool pinned ref | **`c46d591f4f80d9cd88fe2331c702975a93e2afc9`** |
| Package manager files | Root `pnpm-lock.yaml` |

### Recorded benchmark (dry-run, no writes)

Captured on Windows with dry-run (`2026-04`, tool version in this repository): wall-clock **≈2.4–3.0 s**, **904** product source files scanned; **287** files with legacy `@solana/web3.js` imports; **2** manifest additions in the sample report (compat + client; root already listed `@solana/kit`).

Reproduce locally:

```bash
git clone https://github.com/solana-labs/explorer.git explorer-case
cd explorer-case
git checkout 0c71e7272ef8eb1a72a9b2b16c5cd2056b6d5c63
pnpm install   # explorer’s own lock workflow
pnpm run types   # keep this green before migration storytelling

# Pilot tool repository (this package)
cd /path/to/solana-compat-pilot
npm ci

npm run benchmark:pipeline -- --target /absolute/path/to/explorer-case

node ./scripts/migration-pipeline.mjs \
  --target /absolute/path/to/explorer-case \
  --dry-run \
  --report /absolute/path/to/explorer-case/solana-compat-pilot-report.json

node ./scripts/migration-score.mjs /absolute/path/to/explorer-case/solana-compat-pilot-report.json
```

Capture **stdout/stderr exit codes** for `pnpm run types`, `pnpm test`, or `pnpm run build` *before* you depend on narratives in filings.

Apply mode on the full explorer is deliberately **not claimed** here: Next.js breadth means real applies should still be guarded with project-specific `--check` gates and iterative review (`needs-review` files).

## After migrate ref (manual)

Maintain a **`case-study/after-compat-migration` tag / branch** once you genuinely land an apply + validations. Record **`git rev-parse HEAD`** separately and stash install/build logs next to dry-run artefacts.

## Proof bundle checklist (submission-ready)

- Pilot commit SHA (this repo): `c46d591f4f80d9cd88fe2331c702975a93e2afc9`.
- External target SHA (before): `0c71e7272ef8eb1a72a9b2b16c5cd2056b6d5c63`.
- Committed deterministic sample artifacts:
  - `case-study/artifacts/dry-run.report.json`
  - `case-study/artifacts/dry-run.summary.json`
- Command recipe and validator gates:
  - `case-study/REPLAY.md`
  - `case-study/baseline-commands.txt`

If you publish an after-migration branch, add that SHA and the corresponding `types/test/build` logs in this section.

---

## Ledger template (human false-positive / negative rows)

Append rows beside your migration notes — tie every claim to commits.

| date | pilot SHA | external repo SHA | category | symptom | mitigation |
| --- | --- | --- | --- | --- | --- |
| yyyy-mm-dd | … | … | FN / FP | … | rollback / tweak transform |

---

## Automated score artefact CLI

Reuse `solana-compat-pilot-report.json` from `--dry-run` or `--apply`:

```
node scripts/migration-score.mjs ../target-repo/solana-compat-pilot-report.json
```

See also [migration-score.md](migration-score.md) for formula text.
