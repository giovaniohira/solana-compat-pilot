# Solana Compat Pilot

Solana Compat Pilot is a conservative Codemod/JSSG migration package for moving
`@solana/web3.js` v1 projects onto the `@solana/web3-compat` bridge and preparing
them for progressive `@solana/kit` adoption.

The goal is not to guess through hard semantic rewrites. The deterministic pass
handles changes that are safe at scale, while risky full-Kit migrations are
reported with clear AI/human follow-up instructions.

## Why This Wins

- Automates the low-risk bridge step for real Solana projects.
- Minimizes false positives by only touching files that import or require
  `@solana/web3.js`.
- Leaves review markers for complex migration areas such as `Connection`,
  `PublicKey`, `Keypair`, mutable transactions, and subscriptions.
- Ships as a Codemod workflow with fixtures, documentation, and a modular path
  to real-repo validation.

## Usage

```bash
npm install
npm test
npx codemod workflow validate -w workflow.yaml
npx codemod workflow run -w workflow.yaml -t /path/to/solana-project --allow-dirty --no-interactive
```

## Current Scope

Automated:

- ESM imports from `@solana/web3.js` to `@solana/web3-compat`.
- CommonJS `require("@solana/web3.js")` to `@solana/web3-compat`.
- Review markers for full-Kit migration hotspots.

Not automated yet:

- `new Connection(...)` to `createSolanaRpc(...)`.
- `new PublicKey(...)` to `address(...)`.
- `Keypair` to async Kit signer APIs.
- Mutable `Transaction` builders to Kit transaction-message pipelines.

Those patterns require project-specific semantics and are intentionally left for
the bounded AI/manual phase until fixtures prove zero-false-positive handling.
