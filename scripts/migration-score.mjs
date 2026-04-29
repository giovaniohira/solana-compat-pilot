#!/usr/bin/env node
/**
 * Computes a deterministic "automation estimate" percentage from a dry-run pipeline report JSON.
 *
 * Formula (explicit, repeatable):
 *
 * ```
 * legacyFilesBefore = summary.sourceFilesWithLegacySolanaImportsBefore
 * automatableConfidenceFiles ≈ confidence.safeFiles.length
 * pct ≈ safeFilesCoverage = automatableConfidenceFiles / legacyFilesBefore * 100
 * ```
 *
 * This is intentionally conservative — `confidence.needsReview.length` hotspots still require humans.
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const reportPath = process.argv[2];
if (!reportPath || reportPath === "--help") {
  console.error(
    [
      "usage: node ./scripts/migration-score.mjs <path/to/solana-compat-pilot-report.json>",
      "Prints extracted counts + safeFilesCoveragePercent (+ NaN guards).",
      "",
      "Ledger (human): record false-positive / false-negative rows next to pinned SHAs — see case-study/EXTERNAL.md.",
    ].join("\n"),
  );
  process.exit(reportPath ? 0 : 1);
}

const raw = JSON.parse(readFileSync(reportPath, "utf8"));
const legacyBefore = Number(raw.summary.sourceFilesWithLegacySolanaImportsBefore ?? NaN);
const safeLen = Number(raw.confidence?.safeFiles?.length ?? NaN);
const needsReviewLen = Number(raw.summary?.filesNeedingReview ?? raw.confidence?.needsReview?.length ?? NaN);
const manifestChanges = Number(raw.summary?.manifestChanges ?? 0);

let safeFilesCoveragePercent = legacyBefore <= 0 || Number.isNaN(legacyBefore)
  ? null
  : Number(((safeLen / legacyBefore) * 100).toFixed(2));

const out = {
  reportFile: basename(reportPath),
  schemaVersion: raw.schemaVersion,
  sourceFilesWithLegacySolanaImportsBefore: legacyBefore,
  confidenceSafeFiles: safeLen,
  filesNeedingReview: needsReviewLen,
  manifestDependencyChangesRecorded: manifestChanges,
  automationFormula:
    "(confidence.safeFiles length / summary.sourceFilesWithLegacySolanaImportsBefore) × 100 (guards legacyBefore > 0)",
  safeFilesCoveragePercent,
  knownFNReference: raw.knownFalseNegativeCategories ?? [],
};

console.log(JSON.stringify(out, null, 2));
