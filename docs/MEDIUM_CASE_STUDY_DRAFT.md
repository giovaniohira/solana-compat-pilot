# Case study draft (Medium / dev.to) — paste and edit

**Suggested title:** *Solana Compat Pilot: why I refused to “one-click” your web3.js migration*

**Subtitle ideas:** JSSG + compat bridge first · validation-gated apply · honest hotspots

---

Solana teams are under pressure to leave legacy `@solana/web3.js` v1 patterns behind. The ecosystem’s answer is not a single magical jump to `@solana/kit`: it is a **staged** path where `@solana/web3-compat` carries most call sites while you prove the harder semantic moves.

**Solana Compat Pilot** is my entry for the Codemod “boring migration” era: a **workflow + CLI** that automates what is genuinely mechanical, reports what is not, and refuses to ship silent false confidence.

## The failure mode I designed against

Most migration tools die in production for predictable reasons:

- They match **text** instead of real module boundaries.
- They treat `Connection`, `Keypair`, and `Transaction` like string renames.
- They ship **no rollback**, **no machine-readable report**, and **no requirement** to run your tests after apply.

Solana Compat Pilot does the opposite. The JSSG codemod only touches **string literals that are the module specifier** in imports, `require`, dynamic `import()`, TypeScript `import = require`, and **`export … from`** re-exports. If your file never imported `@solana/web3.js`, it is left alone.

## What runs in CI vs what stays human

The default path is **deterministic**. CI runs **fifty** ast-grep fixture pairs and **twenty-two** integration tests over the migration runner: dry-run, apply, rollback patch generation, workspace-aware manifests, dirty-git refusal, and the narrow `--direct-kit` literal transforms.

The workflow can optionally call a **bounded AI** follow-up for marked hotspots — but that path is **not** exercised in CI. I want reviewers to see that the baseline is safe without model entropy.

## Evidence beyond fixtures

Synthetic tests are table stakes. I pinned two real corpora:

1. **`solana-labs/explorer`** — a large Next.js + pnpm app.
2. **`solana-labs/solana-program-library` / `token/js`** — a smaller library-shaped surface.

For each, the repository documents **exact git SHAs**, commands for dry-run, and committed JSON samples under `case-study/artifacts/`. Judges can re-run the pipeline and compare numbers on their own machines (documented as machine-dependent).

## Operator ergonomics

`migration-pipeline.mjs` is the product surface for teams:

- **`--dry-run`** writes a JSON report and **does not** mutate sources.
- **`--apply`** can change manifests and sources, emits a **git rollback patch**, and **requires `--check`** unless you explicitly accept unverified applies.
- **`--direct-kit`** is opt-in per transform, with fixtures proving each narrow pattern.

That combination is how you migrate **boring** infrastructure: small diffs, explainable steps, and a path back.

## What I still refuse to automate (on purpose)

Async signer migration, mutable transaction builders, and subscription rewrites are flagged — not guessed. The goal is not a fantasy “percentage migrated to Kit” headline; it is a **reviewable** bridge with an honest backlog.

## Try it

Registry: `npx codemod solana-compat-pilot`  
Repository: `https://github.com/giovaniohira/solana-compat-pilot`

If you maintain Solana developer docs, there is a **paste-ready issue** in `docs/FRAMEWORK_ADOPTION.md` proposing a compat-first paragraph in official migration guidance — link the live GitHub issue URL from your BUIDL once opened.

---

*End draft — trim paragraphs for your platform’s character limits; add your demo video embed and issue URL once live.*
