# Knowledge Base

This file is the project memory for Solana Compat Pilot. Every phase records
evidence, decisions, trade-offs, failures, and validation outcomes here before
the council scores the work.

## Problem Understanding

The hackathon rewards production-grade migration workflows, not AI demos. A
winning migration must automate the repetitive majority, keep false positives
near zero, and leave hard semantic work in a bounded review path.

For Solana projects, the painful migration is not only replacing package names.
The v1 API is class-oriented (`Connection`, `PublicKey`, `Keypair`,
`Transaction`), while Kit is function-oriented and often async. Blindly rewriting
those patterns can break runtime behavior.

## Competitive Analysis

Observed BUIDL field (DoraHacks Boring AI listing): **21** submissions as of May 2026 — see `docs/HACKATHON_WIN_PLAN.md` for the submit playbook.

| Project | Core Idea | Good | Weak | Exploitable Insight |
| --- | --- | --- | --- | --- |
| wagmi-v1-to-v2 Codemod | wagmi v1 to v2 | Real repos, guards, 85% claim | Many follow-ups | Strong evidence beats broad claims. |
| web3py-v6-to-v7 Codemod | Python web3.py v6 to v7 | 26 fixtures, 81.8% coverage | Crowded category | Fixture depth is table stakes. |
| brownie-ape framework | Brownie to Ape | Clear real migration, 90.1% claim | AI step risk | Hybrid workflows need strict boundaries. |
| IDLift | Anchor IDL/Rust/TS | 200 tests, registry, real repos | Very strong competitor | Depth and byte-exact evidence stand out. |
| Wagmi Hybrid AST-AI | wagmi v1 to v2 | Adoption PR, registry | Single repo proof | Official adoption is a major signal. |
| Web3Py V7 Transmuter | web3.py v6 to v7 | Demo UI, warnings | Regex engine, weaker JSSG story | Avoid regex-first positioning. |
| web3.py v6 to v7 migration | web3.py v6 to v7 | GitHub Actions, docs | Narrower fixture count | Transparent out-of-scope improves trust. |
| EtherMod | ethers, wagmi, Solana suite | Multi-package ambition | Too broad for proof | We should be narrower and more rigorous. |
| ethers-v5-to-v6-codemod | ethers v5 to v6 | Registry, case study | Small real-repo corpus | Case study quality matters. |
| SolSweep | Solana migration engine | Compiler loop, dashboard | Uses jscodeshift, broad app surface | JSSG-native package is a differentiator. |
| Leviathan | Multi-migration engine | Strong narrative | Overbroad and theatrical | Concrete validation beats branding. |

## Project Ideas

1. Full ethers v5 to v6: high pain but crowded and already has registry entries.
2. wagmi v1 to v2: high pain but crowded, with official PR competitor.
3. Solana v1 to Kit bridge: pre-approved, high pain, less JSSG-native evidence,
   and a safe progressive path via `@solana/web3-compat`.

## Selected Strategy

Selected: Solana Compat Pilot.

The product migrates `@solana/web3.js` v1 imports to the official compat bridge
and marks full-Kit hotspots for bounded AI/manual follow-up. This is intentionally
conservative: it creates immediate value while avoiding unsafe rewrites of async
signer flows, RPC semantics, and transaction construction.

Success definition:

- Safe deterministic import migration with zero false positives.
- Review markers for all detected high-risk Kit migration surfaces.
- Fixture matrix covering ESM, CommonJS, negative cases, and hotspot markers.
- Real-repo run with coverage accounting and no unsupported silent rewrites.

## Migration Patterns

| Pattern | Deterministic Action | Confidence |
| --- | --- | --- |
| `import ... from "@solana/web3.js"` | Rewrite source to `@solana/web3-compat` | High |
| `require("@solana/web3.js")` | Rewrite source to `@solana/web3-compat` | High |
| `import("@solana/web3.js")` | Rewrite source to `@solana/web3-compat` | High |
| `new PublicKey("<literal>")` without legacy object/member usage | Opt-in rewrite to `address("<literal>")` from `@solana/kit` | High |
| `new Connection("<literal>")` without endpoint post-processing usage | Opt-in rewrite to `createSolanaRpc("<literal>")` from `@solana/kit` | High |
| `new Connection(...)` | Add marker, no rewrite | Medium risk |
| `new PublicKey(...)` with object API usage | Add marker, no rewrite | Medium risk |
| `Keypair.*` | Add marker, no rewrite | High risk |
| `new Transaction(...)` | Add marker, no rewrite | High risk |
| `onAccountChange` | Add marker, no rewrite | High risk |
| `sendAndConfirmTransaction` | Add marker, no rewrite | High risk |

## AST Strategies

- Use JSSG with Tree-sitter parsing.
- Match `import_statement` nodes containing package string literals.
- Match `require($SOURCE)` call expressions containing package string literals.
- Only transform string literals inside matched import/require nodes.
- Never rewrite locally defined `PublicKey`, `Connection`, or `Keypair` symbols
  unless they are in a file that imports the legacy Solana package.

## Edge Cases

- Namespace imports: supported by package-source rewrite.
- Aliased named imports: supported by package-source rewrite.
- CommonJS imports: supported by package-source rewrite.
- Type-only imports: supported by package-source rewrite.
- Dynamic imports: supported by package-source rewrite.
- Direct Kit `PublicKey` literals: supported only when the imported `PublicKey`
  is used for string-literal constructors and constructed values are not used
  through legacy object/member APIs.
- Multi-package files: only the Solana package source should change.
- Existing marker: do not duplicate marker comments.
- Dirty git targets: apply mode refuses uncommitted changes unless the operator
  passes `--allow-dirty`.

## Failure Modes

- False positive: rewriting a string unrelated to import/require. Mitigation:
  edits only come from AST-matched import or require nodes.
- Overclaiming Kit migration: avoided by using compat bridge and markers.
- AI hallucination: AI step must be bounded to marked files and must keep compat
  unless tests prove direct Kit rewrites.
- Marker noise: marker is only inserted when full-Kit hotspots exist.

## Validation Rules

- `npm test` must pass all fixtures.
- `npm run validate` must validate `workflow.yaml`.
- Real-repo validation must record baseline status, command, changed files,
  unsupported markers, and post-run status.
- Any unsupported pattern must be reported, not silently ignored.

## System Design Decisions

- Package name: `solana-compat-pilot`.
- Repo: `https://github.com/giovaniohira/solana-compat-pilot`.
- First version is capability-free: no unrestricted fs, no fetch, no child process.
- Deterministic first; AI is a review/remediation assistant, not the primary
  transformer.
