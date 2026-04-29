import { relative } from "node:path";

import { DIRECT_KIT_TRANSFORMS } from "./constants.mjs";
import { normalizePath } from "./fs-utils.mjs";

const KNOWN_FALSE_NEGATIVE_CATEGORIES = [
  "Namespaced or aliased @solana/web3.js imports are not always detected by the string-based legacy import counter.",
  "Dynamic import(\"@solana/web3.js\") is counted only when the module specifier is a static string literal.",
  "sendAndConfirmTransaction and subscription hotspots are matched on direct call/property forms; indirect references may be missed.",
  "Direct Kit transforms skip files when constructed values flow into member APIs or when imports are type-only/aliased.",
  "Manifest migration only edits the root package.json; workspace package manifests are not walked automatically.",
];

export function buildReport({ target, mode, before, after, manifestPlan, codemod, directKit, validation, rollback }) {
  const changedManifests = manifestPlan.changes.map((change) => ({
    ...change,
    file: normalizePath(relative(target, manifestPlan.packageJsonPath)),
  }));

  const unsafeFiles = after.files.filter((file) => file.confidence === "needs-review");
  const dynamicImportFiles = after.files.filter((file) => file.dynamicImports > 0);

  return {
    schemaVersion: "1.1",
    tool: "solana-compat-pilot",
    mode,
    target,
    summary: {
      sourceFilesScanned: before.summary.sourceFilesScanned,
      sourceFilesWithLegacySolanaImportsBefore: before.summary.filesWithLegacySolanaImports,
      sourceFilesWithLegacySolanaImportsAfter: after.summary.filesWithLegacySolanaImports,
      manifestChanges: changedManifests.length,
      directKitFilesChanged: directKit.filesChanged,
      filesNeedingReview: unsafeFiles.length,
      dynamicImportFiles: dynamicImportFiles.length,
      unsupportedDynamicImports: 0,
      validationFailures: validation.filter((item) => item.exitCode !== 0).length,
    },
    manifest: {
      changed: manifestPlan.changed,
      changes: changedManifests,
      lockfileRefreshRequired: manifestPlan.lockfileRefreshRequired,
      installCommand: manifestPlan.installCommand,
    },
    confidence: {
      safeFiles: after.files.filter((file) => file.confidence === "safe").map((file) => file.path),
      needsReview: unsafeFiles.map((file) => ({
        path: file.path,
        hotspots: file.hotspots,
      })),
      unsupported: [],
    },
    codemod,
    directKit,
    validation,
    rollback,
    nextSteps: buildNextSteps(manifestPlan, unsafeFiles, validation),
    migrationLimits: {
      hotspotDetection: "typescript-ast",
      directKitTransformsOffered: [...DIRECT_KIT_TRANSFORMS],
    },
    knownFalseNegativeCategories: KNOWN_FALSE_NEGATIVE_CATEGORIES,
    validationShellRisk:
      "Validation commands are executed with exec in the target cwd; only run trusted commands on trusted repositories.",
  };
}

function buildNextSteps(manifestPlan, unsafeFiles, validation) {
  const steps = [];
  if (manifestPlan.lockfileRefreshRequired) {
    steps.push(`Run ${manifestPlan.installCommand} to refresh the lockfile after dependency edits.`);
  }
  if (unsafeFiles.length > 0) {
    steps.push("Review SOLANA_COMPAT_PILOT markers before attempting direct Kit rewrites.");
  }
  if (validation.some((item) => item.exitCode !== 0)) {
    steps.push("Fix validation failures or roll back with the rollback command in this report.");
  }
  return steps;
}
