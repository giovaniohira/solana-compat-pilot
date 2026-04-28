# Problem Deconstruction

## Boring Engineering Work

Boring engineering work is necessary maintenance with high coordination cost and
low product novelty: dependency upgrades, breaking API migrations, framework
configuration changes, deprecations, and large mechanical refactors.

The pain is not typing replacements. The pain is knowing which replacements are
safe, proving the system still works, and coordinating review across many files.

## Why Codemods Fail

- They match text instead of imported symbols.
- They overfit toy fixtures.
- They apply false-positive rewrites to local variables.
- They cannot handle async/control-flow changes safely.
- They skip rollback, dry-run, and validation reporting.
- They market coverage without measuring missed patterns.

## Realistic 80% Automation

For Solana migration, realistic automation is staged:

1. Bridge imports and dependencies safely.
2. Detect high-risk Kit migration surfaces.
3. Add direct Kit rewrites only where API equivalence is proven.
4. Run build/test validation.
5. Leave unsupported semantics as explicit review work.

## Ranked Opportunities

| Rank | Opportunity | Pain | Differentiation | Risk | Decision |
| ---: | --- | --- | --- | --- | --- |
| 1 | Solana web3.js v1 to compat/Kit | High | Less JSSG-native proof, official bridge path | Medium | Selected |
| 2 | Brownie to Ape | High | Real successor migration | Competitor already claims 90% | Rejected |
| 3 | web3.py v6 to v7 | High | Python ecosystem | Multiple competitors | Rejected |
| 4 | wagmi v1 to v2 | High | Strong demo potential | Crowded and official PR competitor | Rejected |
| 5 | ethers v5 to v6 | High | Clear patterns | Registry already has strong entries | Rejected |

## Council Review: Phase 1

| Council Member | Score | Flaws | Fixes |
| --- | ---: | --- | --- |
| Principal Engineer | 9 | Good failure analysis. | Keep unsupported patterns explicit. |
| Staff Engineer | 8 | Needs staged architecture. | Use milestone roadmap. |
| Product Manager | 8 | Compat bridge value needs framing. | Emphasize safe migration runway. |
| Hackathon Judge | 8 | Must show more than import rewrite. | Add marker/reporting and roadmap. |
| QA Engineer | 8 | Need coverage accounting. | Add fixture and real-run reports. |
| Security Engineer | 9 | Conservative behavior is safe. | Keep no capabilities. |
| Performance Engineer | 9 | Low-cost pass. | Avoid default AI. |
| Skeptical Reviewer | 8 | May be perceived as small. | Validate against real repos. |

Status: approved, all scores >= 8.
