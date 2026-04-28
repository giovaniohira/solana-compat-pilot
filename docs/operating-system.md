# Internal Operating System

## Knowledge System

The knowledge system lives in `docs/knowledge-base.md` and is updated whenever
research, implementation, validation, or council review changes the project
state.

Required sections:

- Problem Understanding
- Competitive Analysis
- Project Ideas
- Selected Strategy
- Migration Patterns
- AST Strategies
- Edge Cases
- Failure Modes
- Validation Rules
- System Design Decisions

Update rules:

- Record evidence before decisions.
- Record trade-offs for every scope decision.
- Promote failures into failure-mode entries.
- Convert stable migration rules into fixtures before claiming support.
- Council reviews must cite knowledge-base facts.

Retrieval approach:

- Before implementation, query the migration pattern and AST strategy sections.
- Before release, query validation rules and failure modes.
- Before positioning, query competitive analysis and selected strategy.

## Build Team

| Role | Responsibility | Outputs |
| --- | --- | --- |
| Senior Software Architect | System boundaries, workflow architecture, safety model | Architecture notes, trade-offs |
| AI/LLM Engineer | Bounded AI usage and prompts | AI step instructions, failure boundaries |
| AST/Codemod Specialist | JSSG rules and transform safety | Codemods, fixtures, AST notes |
| Backend Engineer | CLI workflow, package metadata, validation | `workflow.yaml`, scripts, CI |
| Developer Experience Engineer | Usage flow and docs | README, case study, examples |

## AI Council

| Role | Evaluation Focus |
| --- | --- |
| Principal Engineer | Correctness and maintainability |
| Staff Engineer | Scalability and architecture |
| Product Manager | Usefulness and adoption |
| Hackathon Judge | Differentiation and prize fit |
| QA Engineer | Edge cases and test coverage |
| Security Engineer | Capabilities and unsafe operations |
| Performance Engineer | Runtime cost and AI minimization |
| Skeptical Reviewer | Overclaims, fake features, weak proof |

Rules:

- Each council member scores 0-10.
- Any score below 8 fails the artifact.
- Fixes must be concrete, not motivational.
- Re-review after fixes until the artifact has executable evidence, not just a
  favorable opinion.

## Reusable Skills

| Skill | Purpose | Input | Output | When Used |
| --- | --- | --- | --- | --- |
| Codebase Analysis | Find package usage and migration surface | Target repo | Usage map | Before real-repo runs |
| AST Mapping | Convert examples into JSSG rules | Before/after examples | Node kinds and rules | Before transforms |
| Migration Pattern Extraction | Build deterministic rule catalog | Official docs | Pattern table | Phases 1, 4, 7 |
| Competitor Analysis | Find gaps in other BUIDLs | DoraHacks/API data | Differentiation matrix | Phase 2 |
| Failure Simulation | Stress test transforms | Rules and fixtures | FP/FN risks | Before council review |
| Diff Validation | Review generated diffs | Codemod output | Safety report | After every run |
| Real-Repo Case Study | Package proof | Target repo result | Case study | Submission polish |

## Phase Roadmap

| Phase | Goal | Deliverable | Checkpoint |
| --- | --- | --- | --- |
| -1 | Competition intelligence | Strategy and success criteria | Council >= 8 |
| Pre-0 | Internal system | KB, agents, skills, framework | Council >= 8 |
| 1 | Problem deconstruction | Pain map and opportunities | Council >= 8 |
| 2 | BUIDL analysis | 11-project matrix | Council >= 8 |
| 3 | Project selection | Selected idea and repo name | Council >= 8 |
| 4 | KB expansion | Patterns, edge cases, validation | Council >= 8 |
| 5 | System design | Architecture and flow | Council >= 8 |
| 6 | Implementation plan | Testable milestones | Council >= 8 |
| 7 | Implementation | Modular commits and validation | Council per milestone |
| 8 | Final judgment | Judge simulation and fixes | Council >= 8 |

## Evaluation Framework

Scale:

- 0-3: unusable
- 4-6: weak
- 7-8: acceptable
- 9-10: strong

Critical rules:

- Any score below 8 fails.
- False positives are worse than missed patterns.
- Unsupported patterns must be surfaced.
- AI output is not trusted without validation.

## Operating Risks

The council framework is useful only as a checklist. It is not evidence by
itself and must not be presented as proof of quality. Only executable gates,
fixture results, real-repo validation, and reproducible reports count as proof.
