import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { DEFAULT_PATCH_PATH, DEFAULT_REPORT_PATH, DIRECT_KIT_TRANSFORMS } from "./constants.mjs";
import { applyDirectKitTransforms } from "./direct-kit.mjs";
import { runCodemod } from "./codemod-runner.mjs";
import { runCommand } from "./exec.mjs";
import { writeJson } from "./fs-utils.mjs";
import { assertCleanGitTarget } from "./git-check.mjs";
import { applyManifestPlan, detectInstallCommand, planManifestMigration } from "./manifest.mjs";
import { createRollbackPatch } from "./rollback.mjs";
import { buildReport } from "./report.mjs";
import { analyzeTarget, buildScanOptions } from "./scan.mjs";

export async function runPipeline(options) {
  const target = resolve(options.target ?? ".");
  const apply = Boolean(options.apply);
  const reportPath = resolve(options.report ?? join(target, DEFAULT_REPORT_PATH));
  const patchPath = resolve(options.patch ?? join(target, DEFAULT_PATCH_PATH));
  const validationCommands = options.checks ?? [];
  const shouldInstall = Boolean(options.install);
  const directKitTransforms = options.directKit ?? [];
  const allowDirty = Boolean(options.allowDirty);
  const skipValidation = Boolean(options.skipValidation);
  const scanOptions = buildScanOptions(options);

  assertDirectory(target);
  assertDirectKitTransformsAllowed(directKitTransforms);
  if (apply) assertCleanGitTarget(target, allowDirty);
  if (apply && !skipValidation && validationCommands.length === 0) {
    throw new Error(
      "Apply mode requires at least one --check command (for example \"npm test\"). Pass --skip-validation only when you intentionally accept an unverified apply.",
    );
  }

  const before = analyzeTarget(target, scanOptions);
  const manifestPlan = planManifestMigration(target);
  const validation = [];
  let codemod = { status: "skipped", command: null, error: null };
  let directKit = { status: "skipped", transforms: directKitTransforms, filesChanged: 0, changes: [], error: null };
  let rollback = { available: false, path: null, command: null, reason: "dry-run" };

  if (apply) {
    applyManifestPlan(manifestPlan);
    codemod = runCodemod(target);
    directKit = applyDirectKitTransforms(target, directKitTransforms, scanOptions);

    if (shouldInstall) {
      validation.push(runCommand(target, detectInstallCommand(target), "install"));
    }

    for (const command of validationCommands) {
      validation.push(runCommand(target, command, "check"));
    }

    rollback = createRollbackPatch(target, patchPath);
  }

  const after = analyzeTarget(target, scanOptions);
  const report = buildReport({
    target,
    mode: apply ? "apply" : "dry-run",
    before,
    after,
    manifestPlan,
    codemod,
    directKit,
    validation,
    rollback,
  });

  writeJson(reportPath, report);
  return report;
}

function assertDirectory(target) {
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Target directory does not exist: ${target}`);
  }
}

function assertDirectKitTransformsAllowed(transforms) {
  const invalid = transforms.filter((transform) => !DIRECT_KIT_TRANSFORMS.has(transform));
  if (invalid.length > 0) {
    throw new Error(`Unknown direct Kit transform: ${invalid.join(", ")}`);
  }
}
