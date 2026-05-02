# BUIDL Analysis

Source: DoraHacks Boring AI listing (May 2026), **21** visible submissions (API count may lag). Earlier rows below were from an earlier scrape; treat [`HACKATHON_WIN_PLAN.md`](HACKATHON_WIN_PLAN.md) as the live submit playbook.

## High-threat entries (post-field review)

| Project | Why it scores |
| --- | --- |
| @solana/web3.js v1→v2 **suite** (3 registry codemods, 21 fixtures, adoption issues) | Breadth + distribution |
| **SolSweep** (tsc-in-loop + product narrative) | “Zero hallucinations” + full Kit story |
| **EtherMod** (ethers + wagmi + solana-web3-to-kit registry) | Direct Solana overlap with bolder automation claims |
| **IDLift** (200 tests, named protocols) | Gold standard for evidence density |
| **Hybrid wagmi** (upstream PR + benchmark repo) | Adoption track multiplier |

## Individual Analysis

| Project | Core Idea | Good | Weak | Missing | Viability | Exploitable Insight |
| --- | --- | --- | --- | --- | --- | --- |
| wagmi-v1-to-v2 Codemod | AST codemod for wagmi v1 to v2 | Multiple real repos, guard claims | Follow-up count is high | Registry/adoption proof unclear | Medium-high | Evidence must distinguish codemod bugs from repo fixes. |
| web3py-v6-to-v7 Codemod | ast-grep Python migration | 26 fixtures, 81.8% coverage | Similar to other entries | Real-repo details need verification | High | Fixture count is a visible trust signal. |
| brownie-ape framework | Brownie to Ape hybrid workflow | Clear deprecation pain, 90.1% claim | AI step could be broad | Tests not visible from listing | Medium | Tight AI boundaries matter. |
| IDLift | Anchor IDL/Rust/TS migration | 26 rules, 200 tests, registry, real repos | Strong but broad | May overclaim full-stack safety | Very high | Strongest competitor: depth plus proof. |
| Wagmi Hybrid AST-AI | wagmi + TanStack callback migration | Official adoption PR, registry, quick demo | One benchmark repo in summary | More negative tests | High | Adoption PR is a prize multiplier. |
| Web3Py V7 Transmuter | web UI + regex/deterministic migration | Demo deployment, warning system | Regex-first, not JSSG-native | Real fixture proof | Medium | Avoid looking like a demo UI. |
| web3.py v6 to v7 migration | Codemod.com workflow | Conservative out-of-scope, CI | Only 9 fixtures in listing | Broader pattern coverage | Medium-high | Honest exclusions improve credibility. |
| EtherMod | Multi-package Web3 codemods | Ambitious suite, registry claims | Too broad for deep proof | Per-transform evidence | Medium | Narrower tools can beat broad suites. |
| ethers-v5-to-v6-codemod | ethers v5 to v6 | Registry, case study, zero FP claim | Small real repo | More public fixtures | High | Case study is valuable but corpus size matters. |
| SolSweep | Solana compiler-in-loop app | Strong validator narrative | Uses jscodeshift; app surface may distract | Codemod registry/JSSG compliance | Medium | A JSSG-native Solana package can differentiate. |
| Leviathan | Multi-migration immune system | Memorable narrative, syntax checks | Overbroad claims, theatrical | Focused validation | Low-medium | Concrete scope beats broad branding. |

## Common Weaknesses

- Many projects claim 80-95% automation without reproducible scoring.
- Several rely on broad AI or regex language.
- Real-repo validation is often thin or hard to reproduce.
- False-positive claims are not always tied to negative tests.
- Official adoption is rare and therefore valuable.

## What Not To Build

- A generic dashboard without a strong codemod package.
- A multi-migration suite with shallow proof.
- A regex-first migration.
- An AI wrapper that edits without deterministic scope.
- A project that silently skips unsupported cases.

## Where To Dominate

- JSSG-native Solana migration package.
- Clear conservative safety model.
- Strong negative fixtures.
- Compatibility bridge as a production-safe first step.
- Explicit full-Kit readiness markers and confidence accounting.

## Competitive Risk

The strongest competitors show deeper automation, more fixtures, registry proof,
or adoption attempts. This project can only compete if it turns the Solana lane
into a measured migration pipeline: manifest edits, reports, rollback, CI,
real-repo replay, and direct Kit transforms that are added only when proven.
