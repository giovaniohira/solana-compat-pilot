# Framework adoption — issue draft

Copy into a new issue on **`solana-foundation/solana-web3.js`** (or the repo where migration docs live). Replace placeholders after registry publish.

## Title

```
docs: document codemod-friendly @solana/web3.js → @solana/web3-compat path
```

## Body

```markdown
## Context

Teams migrating off legacy `@solana/web3.js` v1 APIs need a **reviewable** first step before jumping straight to `@solana/kit`. The ecosystem already ships **`@solana/web3-compat`** as the supported compatibility bridge.

## Proposal

Link (or briefly document) a **compat-first** migration path from the official migration guide / README:

1. Deterministic **import rewrites** from `@solana/web3.js` → `@solana/web3-compat` (JSSG / ast-grep scoped to package string literals).
2. Explicit review for `Connection`, `Keypair`, `Transaction`, subscriptions, and `sendAndConfirmTransaction` before removing compat.
3. Optional, narrow Kit transforms only where patterns are provably safe.

## Reference implementation

- **Repository:** https://github.com/giovaniohira/solana-compat-pilot  
- **Codemod registry (after publish):** `npx codemod <YOUR_SLUG_HERE>`  
- **Replayable evidence:** pinned `solana-labs/explorer` + `solana-labs/solana-program-library` (`token/js`) — see `case-study/EXTERNAL.md` in that repo.

## Ask

A short subsection in migration docs (or a link-out to the tool) so developers discover the **compat bridge** before attempting risky full Kit rewrites in one pass.

Happy to adjust wording or open a PR against docs if maintainers prefer that over an issue.
```

## After you file

1. Paste the **issue URL** into your DoraHacks BUIDL and `docs/HACKATHON_WIN_PLAN.md` link placeholders.
2. If maintainers ask for changes, keep this file in sync with the final agreed text.
