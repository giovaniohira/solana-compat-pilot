## Judged automation score (formula)

Machines derive the headline **safeFilesCoveragePercent** using `scripts/migration-score.mjs` over a finalized `solana-compat-pilot-report.json`.

### Inputs from report JSON

- `summary.sourceFilesWithLegacySolanaImportsBefore`
- `confidence.safeFiles` (dry-run arrays)
- `summary.filesNeedingReview` *(informational hotspot bucket)*
- `summary.manifestChanges` *(dependency deltas recorded — may span multiple manifests in workspaces)*

### Headline statistic

`safeFilesCoveragePercent` rounds `(|confidence.safeFiles| / legacyFilesBefore) * 100` to two decimals when `legacyFilesBefore > 0`, else `null` (see [`scripts/migration-score.mjs`](../scripts/migration-score.mjs)).

The script prints JSON with **`safeFilesCoveragePercent`** rounded to **two** decimals plus the raw counts for auditability.

This is complementary to—not a replacement for—the qualitative **needs-review HOTSPOTS** ledger and reviewer spot checks.
