# Competition Intelligence

## Real Goal

DoraHacks Boring AI is a Codemod adoption competition. The visible goal is to
automate 80%+ of real migrations. The deeper goal is to produce reusable,
reviewable migration infrastructure that Codemod can point real teams toward.

## Explicit Criteria

- Accuracy: zero incorrect changes, with false positives heavily penalized.
- Coverage: automate as much of the migration as possible.
- Reliability: run on real repositories, not only toy fixtures.
- Tests: include a meaningful fixture suite and keep it green.
- Distribution: publishable package with `codemod.yaml`, `workflow.yaml`, docs,
  and registry path.

## Implicit Judging Criteria

- Trust: judges need to believe the tool will not corrupt production code.
- Evidence: real-repo proof is stronger than claims.
- Restraint: unsupported edge cases should be reported, not guessed.
- Adoption path: maintainers are more likely to adopt conservative tools.
- Reviewability: small, explainable diffs beat broad opaque AI rewrites.

## Meaning of 80%+ Automation

In practice, 80%+ automation means the deterministic pipeline handles the
repeatable migration surface: imports, APIs with one-to-one replacements,
configuration edits, and mechanical call-shape changes. The remaining 20% should
be explicitly identified and either left as review markers or handled by a
bounded AI step with validation.

For this project, the first shippable automation is the safe bridge migration.
The long-term 80% target comes from adding proven direct-Kit transforms one by
one only after fixtures and real-repo runs prove safety.

## Winning Project Shape

A winning project looks like:

- Narrow enough to validate deeply.
- Useful immediately on a real migration.
- Honest about unsupported cases.
- Packaged as a real Codemod workflow.
- Backed by tests, CI, and real-repo evidence.
- Differentiated from demos by rollback, safety, and confidence reporting.

## Risk Review

This strategy only becomes competitive if the implementation proves more than a
bridge import rewrite. The minimum credible bar is dependency migration,
rollback, confidence reporting, CI, a meaningful fixture corpus, reproducible
real-repo validation, and at least one direct Kit transform backed by tests.
