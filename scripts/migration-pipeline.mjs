import { fileURLToPath } from "node:url";

export { applyDirectKitTransforms } from "./pipeline/direct-kit.mjs";
export {
  applyManifestPlan,
  listWorkspacePackageJsonPaths,
  planManifestMigration,
  workspacePatternsFromPackageJson,
} from "./pipeline/manifest.mjs";
export { createRollbackPatch, applyRollbackPatchSync } from "./pipeline/rollback.mjs";
export { analyzeTarget, analyzeSourceFile, listSourceFiles, buildScanOptions } from "./pipeline/scan.mjs";

import { parseArgs, printHelp } from "./pipeline/cli.mjs";
import { runPipeline } from "./pipeline/orchestrate.mjs";

export { runPipeline };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.target) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  runPipeline(options)
    .then((report) => {
      console.log(JSON.stringify(report.summary, null, 2));
      process.exit(report.validation.some((item) => item.exitCode !== 0) ? 1 : 0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
