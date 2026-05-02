# Hackathon win plan — Solana Compat Pilot (Boring AI)

You have not submitted yet. This document steals what top BUIDLs did well and maps it to **your** differentiator: **JSSG-native, compat-bridge-first, validation-gated pipeline** (not “vibe migrate to Kit in one shot”).

## What winners did (extract patterns)


| Pattern                       | Who did it                                                                 | What to copy                                                                                                                                                                                             |
| ----------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One-command + registry**    | @solana/web3 v1→v2 suite, ethers-v5-to-v6, wagmi entries                   | Ship `npx codemod <your-slug>` after `codemod.yaml` publish; put the exact command in README + BUIDL.                                                                                                    |
| **Counted fixtures / tests**  | IDLift (200), web3py entries (9–26), wagmi (8–40)                          | Publish a number: run `npm run fixtures:count` (**50** pairs today). Never round up ambiguously.                                                                                                         |
| **Named real repos + pins**   | IDLift (Drift, Marinade, metaDAO, SPL), web3py (ethereum/web3.py, brownie) | You already pin **solana-labs/explorer** in `case-study/EXTERNAL.md` — add **one second** smaller repo (e.g. a focused SDK or template) if time allows.                                                  |
| **Case study outside GitHub** | Medium / dev.to                                                            | One **800–1200 word** post: problem → approach → dry-run on explorer → score meaning → what you refuse to automate (builds trust).                                                                       |
| **Short demo video**          | Hybrid wagmi, suite                                                        | **60–90s**: clone explorer @ pin → dry-run → open JSON report → show `needs-review` hotspots (honesty sells).                                                                                            |
| **Framework adoption signal** | Wagmi PR, suite opened issues on official repos                            | Open **one** focused issue on `solana-foundation/solana-web3.js` (or compat kit repo): “document / endorse compat-bridge migration path + link to this codemod” — not a demand to merge unsafe rewrites. |
| **Prize tracks spelled out**  | Several BUIDLs list Track 1/2/3                                            | In BUIDL description, explicitly map to Codemod **recipe / case study / adoption** tracks if those still apply.                                                                                          |
| **Hybrid AI only bounded**    | SolSweep (tsc loop), wagmi hybrid                                          | Your `workflow.yaml` already gates AI — in filing, say **CI never runs AI**; deterministic path is default (beats “LLM edits everything”).                                                               |


## Your moat (say this loudly)

1. **Official progression path**: `@solana/web3-compat` is the supported bridge; you automate **that** first, Kit only where provable (`--direct-kit` narrow transforms).
2. **Operator-grade runner**: dry-run / apply / `--check` / rollback — most entries are “run codemod” only.
3. **False-positive discipline**: import-scoped JSSG + negative fixtures + explicit hotspots — same family of proof as top entrants, **without** overclaiming `% migrated to Kit`.

## Priority execution (P0 → P2)

### P0 — Before you click “Submit” (same day)

- Run `npm run ci` locally; fix anything red.
- Run `npm run fixtures:count`; put the number in README + BUIDL (**currently 50** JSSG pairs).
- Hand judges [`docs/JUDGE_REPRO.md`](JUDGE_REPRO.md) (copy-paste repro under five minutes).
- Record **demo video** (screen + voice optional): explorer pin → `migration-pipeline.mjs --dry-run` → show report + migration score stdout.
- Publish **case study** (Medium or dev.to); link in BUIDL + README.
- **Codemod Registry**: publish from this repo’s `codemod.yaml` so judges can run `npx codemod …` without cloning — follow `[REGISTRY_PUBLISH.md](REGISTRY_PUBLISH.md)` (Trusted Publisher + GitHub Action or local `codemod login`).
- Paste **BUIDL block** at bottom of this file into DoraHacks (keep under their character limits; trim if needed).

### P1 — This week (materially raises ceiling)

- Open **framework adoption** GitHub issue (copy from `[docs/FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md)`); link URL in BUIDL.
- Add **second pinned corpus** (smaller than explorer): `solana-labs/solana-program-library` / `token/js` — see `case-study/EXTERNAL.md`.
- **Negative / hotspot fixtures** expanded (`Keypair`, `Transaction`, `sendAndConfirmTransaction`, `onAccountChange`, `Connection` + RPC member) under `tests/*/`.
- If registry name differs from repo name, align **branding**: one name everywhere (BUIDL title = README H1 = package name).

### P2 — If you have extra cycles (diminishing returns vs P0)

- Contribution to upstream docs (solana-web3.js or kit docs) — even a small PR linking compat migration — stronger than more features.
- `migration-score` screenshot or committed summary artifact for explorer (already partially in `case-study/artifacts/` — ensure BUIDL links it).

## Framework adoption draft

Paste-ready copy also lives in `[FRAMEWORK_ADOPTION.md](FRAMEWORK_ADOPTION.md)` (issue title + fenced body).

**Title (example):** Document codemod-friendly path: `@solana/web3.js` → `@solana/web3-compat` → Kit

**Body (edit URLs/names, paste into GitHub issue):**

> Solana app teams need a **reviewable** migration story from legacy `@solana/web3.js` to modern stacks. The foundation already ships `@solana/web3-compat` as a bridge.
>
> I published **Solana Compat Pilot** — a **JSSG (ast-grep) workflow** + CLI that:
>
> - Rewrites imports to `@solana/web3-compat` deterministically (import-scoped; fixture-tested).
> - Offers **narrow, opt-in** Kit transforms only where patterns are provably safe.
> - Emits a **JSON report**, migration score, and **git rollback** patch on apply; requires `--check` for real applies.
>
> Repo: `https://github.com/giovaniohira/solana-compat-pilot`  
> Registry: `npx codemod solana-compat-pilot`  
> Evidence: dry-run on pinned `solana-labs/explorer` — see `case-study/EXTERNAL.md`.
>
> **Ask:** Link this tool (or the general pattern) from the official migration docs / issue tracker so teams discover the compat-first path before risky full rewrites.

## BUIDL description — paste-ready starter

**Title:** Solana Compat Pilot — Deterministic `@solana/web3.js` → compat bridge + gated Kit path

**One-liner:** Production migration pipeline: JSSG codemod + dry-run reports + apply with `--check` + rollback — compat first, Kit only when provable.

**Body (trim for DoraHacks UI):**

Solana upgrades fail when codemods pretend `Connection` / `Keypair` / `Transaction` are string renames. This project does the **opposite**: it automates the **safe majority** (imports + manifests + confidence accounting) and **marks** high-risk Kit surfaces for review.

**Deterministic (default path)**  

- ESM / CJS / dynamic import / `import = require` for `@solana/web3.js` → `@solana/web3-compat`.  
- Workspace-aware `package.json` updates (npm / pnpm workspaces).  
- JSSG fixture suite — **50** `input.ts` / `expected.ts` pairs (`npm run fixtures:count`); **22** integration tests in `tests/pipeline/*.test.mjs` (`npm run test:pipeline`).

**Opt-in Kit**  

- `--direct-kit` for **narrow** literal patterns only; everything else stays flagged.

**Operator workflow**  

- `migration-pipeline.mjs --dry-run` → JSON report + migration score.  
- `--apply` requires `--check` (or explicit skip); dirty git blocked by default; rollback patch for git targets.

**Evidence**  

- Pinned real repo: `solana-labs/explorer` (SHAs in `case-study/EXTERNAL.md` + committed sample artifacts under `case-study/artifacts/`).  
- CI: typecheck + JSSG tests + pipeline tests + workflow validate + npm audit.

**Install**  
`git clone https://github.com/giovaniohira/solana-compat-pilot.git` → `npm ci` → `npm run ci` — Registry: **`npx codemod solana-compat-pilot`** ([listing](https://app.codemod.com/registry/solana-compat-pilot)). Republish after bumps: `docs/REGISTRY_PUBLISH.md`.

**Tracks (map to how DoraHacks / Codemod score you)**  
Recipe / distribution: registry + workflow. Case study: pinned explorer + SPL `token/js` + artifacts. Adoption: open the issue from `docs/FRAMEWORK_ADOPTION.md` and link the URL here.

**Links**  

- GitHub: `https://github.com/giovaniohira/solana-compat-pilot`  
- Case study: publish `docs/MEDIUM_CASE_STUDY_DRAFT.md` to Medium or dev.to → paste URL here  
- Demo: 60–90s screen recording (explorer dry-run → open JSON report → `migration-score` stdout) → paste URL here  
- Adoption issue: paste URL after filing on `solana-foundation/solana-web3.js` (or docs repo)

---

**Revisit after submit:** Upvote honest competitors; reply to questions on your BUIDL within hours — engagement correlates with visibility on DoraHacks.