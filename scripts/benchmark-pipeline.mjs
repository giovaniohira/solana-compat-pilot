#!/usr/bin/env node
/**
 * Wall-clock dry-run of the migration pipeline on a target directory (no git writes).
 *
 * usage: node ./scripts/benchmark-pipeline.mjs --target <path>
 */

import { performance } from "node:perf_hooks";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";

import { runPipeline } from "./pipeline/orchestrate.mjs";

function parseTarget(argv) {
  const index = argv.indexOf("--target");
  if (index === -1 || !argv[index + 1]) {
    console.error("usage: node ./scripts/benchmark-pipeline.mjs --target <path-to-repo>");
    process.exit(1);
  }
  return argv[index + 1];
}

const target = parseTarget(process.argv.slice(2));
const start = performance.now();
const reportPath = join(tmpdir(), `solana-compat-benchmark-${Date.now()}.json`);
const report = await runPipeline({ target, report: reportPath });
const ms = Number((performance.now() - start).toFixed(2));

console.log(
  JSON.stringify(
    {
      wallClockMs: ms,
      host: hostname(),
      sourceFilesScanned: report.summary.sourceFilesScanned,
      legacyImportFiles: report.summary.sourceFilesWithLegacySolanaImportsBefore,
      filesNeedingReview: report.summary.filesNeedingReview,
    },
    null,
    2,
  ),
);
