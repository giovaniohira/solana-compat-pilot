import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LEGACY_PACKAGE = "@solana/web3.js";
const REQUIRED_PACKAGES = {
  "@solana/web3-compat": "^0.0.21",
  "@solana/kit": "^6.8.0",
  "@solana/client": "^1.7.0",
};
const DEFAULT_REPORT_PATH = "solana-compat-pilot-report.json";
const DEFAULT_PATCH_PATH = "solana-compat-pilot.rollback.patch";
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const IGNORE_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);

export async function runPipeline(options) {
  const target = resolve(options.target ?? ".");
  const apply = Boolean(options.apply);
  const reportPath = resolve(options.report ?? join(target, DEFAULT_REPORT_PATH));
  const patchPath = resolve(options.patch ?? join(target, DEFAULT_PATCH_PATH));
  const validationCommands = options.checks ?? [];
  const shouldInstall = Boolean(options.install);

  assertDirectory(target);

  const before = analyzeTarget(target);
  const manifestPlan = planManifestMigration(target);
  const validation = [];
  let codemod = { status: "skipped", command: null, error: null };
  let rollback = { available: false, path: null, command: null, reason: "dry-run" };

  if (apply) {
    applyManifestPlan(manifestPlan);
    codemod = runCodemod(target);

    if (shouldInstall) {
      validation.push(runCommand(target, detectInstallCommand(target), "install"));
    }

    for (const command of validationCommands) {
      validation.push(runCommand(target, command, "check"));
    }

    rollback = createRollbackPatch(target, patchPath);
  }

  const after = analyzeTarget(target);
  const report = buildReport({
    target,
    mode: apply ? "apply" : "dry-run",
    before,
    after,
    manifestPlan,
    codemod,
    validation,
    rollback,
  });

  writeJson(reportPath, report);
  return report;
}

export function analyzeTarget(target) {
  const sourceFiles = listSourceFiles(target);
  const files = sourceFiles.map((filePath) => analyzeSourceFile(target, filePath));
  const packageJsonPath = join(target, "package.json");

  return {
    packageManager: detectPackageManager(target),
    packageJson: existsSync(packageJsonPath) ? analyzePackageJson(packageJsonPath) : null,
    files,
    summary: {
      sourceFilesScanned: sourceFiles.length,
      filesWithLegacySolanaImports: files.filter((file) => file.legacyImports > 0).length,
      legacyImportReferences: sum(files, "legacyImports"),
      dynamicImportReferences: sum(files, "dynamicImports"),
      hotspotCount: files.reduce((total, file) => total + file.hotspots.length, 0),
      existingMarkers: files.filter((file) => file.hasExistingMarker).length,
    },
  };
}

export function planManifestMigration(target) {
  const packageJsonPath = join(target, "package.json");
  if (!existsSync(packageJsonPath)) {
    return {
      packageJsonPath,
      exists: false,
      changed: false,
      changes: [],
      lockfileRefreshRequired: false,
      installCommand: null,
    };
  }

  const packageJson = readJson(packageJsonPath);
  const changes = [];
  const solanaSection = findDependencySection(packageJson, LEGACY_PACKAGE);

  if (!solanaSection) {
    return {
      packageJsonPath,
      exists: true,
      changed: false,
      changes,
      lockfileRefreshRequired: false,
      installCommand: null,
    };
  }

  packageJson[solanaSection] ??= {};

  for (const [name, version] of Object.entries(REQUIRED_PACKAGES)) {
    if (!hasDependency(packageJson, name)) {
      packageJson[solanaSection][name] = version;
      changes.push({
        type: "add-dependency",
        section: solanaSection,
        name,
        version,
        confidence: "high",
        reason: "Solana docs require compat, kit, and client packages for the bridge migration.",
      });
    }
  }

  return {
    packageJsonPath,
    exists: true,
    changed: changes.length > 0,
    changes,
    nextPackageJson: packageJson,
    lockfileRefreshRequired: changes.length > 0 && hasLockfile(target),
    installCommand: changes.length > 0 ? detectInstallCommand(target) : null,
  };
}

export function applyManifestPlan(plan) {
  if (!plan.exists || !plan.changed) return;
  writeJson(plan.packageJsonPath, plan.nextPackageJson);
}

export function listSourceFiles(target) {
  const files = [];
  walk(target, files);
  return files.sort();
}

export function analyzeSourceFile(target, filePath) {
  const source = readFileSync(filePath, "utf8");
  const relPath = normalizePath(relative(target, filePath));
  const legacyImports = findMatches(source, /(?:from\s*|import\s*\(|require\s*\()\s*["']@solana\/web3\.js["']/g);
  const dynamicImports = findMatches(source, /import\s*\(\s*["']@solana\/web3\.js["']\s*\)/g);
  const hotspots = [
    ...findHotspots(source, "Connection", /\bnew\s+([A-Za-z_$][\w$]*\.)?Connection\s*\(/g, "Connection may need createSolanaRpc review."),
    ...findHotspots(source, "PublicKey", /\bnew\s+([A-Za-z_$][\w$]*\.)?[A-Za-z_$]*PublicKey\s*\(/g, "PublicKey may need address() or compat object semantics."),
    ...findHotspots(source, "Keypair", /\b([A-Za-z_$][\w$]*\.)?Keypair\./g, "Keypair to Kit signer changes may require async flow changes."),
    ...findHotspots(source, "Transaction", /\bnew\s+([A-Za-z_$][\w$]*\.)?Transaction\s*\(/g, "Mutable transactions need transaction-message review."),
    ...findHotspots(source, "Subscription", /\bon[A-Za-z]+Change\s*\(/g, "Subscriptions need createSolanaRpcSubscriptions review."),
    ...findHotspots(source, "sendAndConfirmTransaction", /\bsendAndConfirmTransaction\s*\(/g, "Submission flow may need Kit signing/send pipeline changes."),
  ];

  const hasExistingMarker = source.includes("SOLANA_COMPAT_PILOT");

  return {
    path: relPath,
    confidence: hasExistingMarker || (legacyImports.length > 0 && hotspots.length > 0)
      ? "needs-review"
      : legacyImports.length > 0
        ? "safe"
        : "none",
    legacyImports: legacyImports.length,
    dynamicImports: dynamicImports.length,
    hasExistingMarker,
    hotspots,
  };
}

function buildReport({ target, mode, before, after, manifestPlan, codemod, validation, rollback }) {
  const changedManifests = manifestPlan.changes.map((change) => ({
    ...change,
    file: normalizePath(relative(target, manifestPlan.packageJsonPath)),
  }));

  const unsafeFiles = after.files.filter((file) => file.confidence === "needs-review");
  const skippedFiles = after.files.filter((file) => file.dynamicImports > 0);

  return {
    schemaVersion: "1.0",
    tool: "solana-compat-pilot",
    mode,
    target,
    summary: {
      sourceFilesScanned: before.summary.sourceFilesScanned,
      sourceFilesWithLegacySolanaImportsBefore: before.summary.filesWithLegacySolanaImports,
      sourceFilesWithLegacySolanaImportsAfter: after.summary.filesWithLegacySolanaImports,
      manifestChanges: changedManifests.length,
      filesNeedingReview: unsafeFiles.length,
      unsupportedDynamicImports: skippedFiles.length,
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
      unsupported: skippedFiles.map((file) => ({
        path: file.path,
        reason: "dynamic import is detected by the report but not transformed by the JSSG pass yet",
      })),
    },
    codemod,
    validation,
    rollback,
    nextSteps: buildNextSteps(manifestPlan, skippedFiles, unsafeFiles, validation),
  };
}

function buildNextSteps(manifestPlan, skippedFiles, unsafeFiles, validation) {
  const steps = [];
  if (manifestPlan.lockfileRefreshRequired) {
    steps.push(`Run ${manifestPlan.installCommand} to refresh the lockfile after dependency edits.`);
  }
  if (skippedFiles.length > 0) {
    steps.push("Review dynamic imports; they are reported but not rewritten yet.");
  }
  if (unsafeFiles.length > 0) {
    steps.push("Review SOLANA_COMPAT_PILOT markers before attempting direct Kit rewrites.");
  }
  if (validation.some((item) => item.exitCode !== 0)) {
    steps.push("Fix validation failures or roll back with the rollback command in this report.");
  }
  return steps;
}

function runCodemod(target) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const rootDir = resolve(scriptDir, "..");
  const workflowPath = join(rootDir, "workflow.yaml");
  const command = `npx codemod workflow run -w "${workflowPath}" -t "${target}" --allow-dirty --no-interactive`;

  try {
    const output = execSync(command, { cwd: rootDir, encoding: "utf8", stdio: "pipe" });
    return { status: "ok", command, output, error: null };
  } catch (error) {
    return {
      status: "failed",
      command,
      output: error.stdout?.toString() ?? "",
      error: error.stderr?.toString() || error.message,
    };
  }
}

function createRollbackPatch(target, patchPath) {
  if (!isGitRepo(target)) {
    return {
      available: false,
      path: null,
      command: null,
      reason: "target is not a git repository",
    };
  }

  const diff = execFileSync("git", ["-C", target, "diff", "--binary"], { encoding: "utf8" });
  if (!diff.trim()) {
    return { available: false, path: null, command: null, reason: "no changes to roll back" };
  }

  mkdirSync(dirname(patchPath), { recursive: true });
  writeFileSync(patchPath, diff);
  return {
    available: true,
    path: patchPath,
    command: `git -C "${target}" apply -R "${patchPath}"`,
    reason: null,
  };
}

function runCommand(target, command, kind) {
  try {
    const output = execSync(command, { cwd: target, encoding: "utf8", stdio: "pipe" });
    return { kind, command, exitCode: 0, output, error: null };
  } catch (error) {
    return {
      kind,
      command,
      exitCode: typeof error.status === "number" ? error.status : 1,
      output: error.stdout?.toString() ?? "",
      error: error.stderr?.toString() || error.message,
    };
  }
}

function detectInstallCommand(target) {
  const manager = detectPackageManager(target);
  if (manager === "pnpm") return "pnpm install";
  if (manager === "yarn") return "yarn install";
  if (manager === "bun") return "bun install";
  return "npm install";
}

function detectPackageManager(target) {
  if (existsSync(join(target, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(target, "yarn.lock"))) return "yarn";
  if (existsSync(join(target, "bun.lockb")) || existsSync(join(target, "bun.lock"))) return "bun";
  if (existsSync(join(target, "package-lock.json"))) return "npm";
  return "unknown";
}

function hasLockfile(target) {
  return ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"].some((name) =>
    existsSync(join(target, name)),
  );
}

function analyzePackageJson(packageJsonPath) {
  const packageJson = readJson(packageJsonPath);
  return {
    hasLegacyDependency: hasDependency(packageJson, LEGACY_PACKAGE),
    hasCompatDependency: hasDependency(packageJson, "@solana/web3-compat"),
    hasKitDependency: hasDependency(packageJson, "@solana/kit"),
    hasClientDependency: hasDependency(packageJson, "@solana/client"),
  };
}

function findDependencySection(packageJson, name) {
  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    if (packageJson[section]?.[name]) {
      return section;
    }
  }
  return null;
}

function hasDependency(packageJson, name) {
  return Boolean(findDependencySection(packageJson, name));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function walk(directory, files) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(fullPath, files);
      continue;
    }

    if (stats.isFile() && SOURCE_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }
}

function findHotspots(source, kind, regex, reason) {
  return findMatches(source, regex).map((match) => ({ kind, reason, ...match }));
}

function findMatches(source, regex) {
  return [...source.matchAll(regex)].map((match) => {
    const before = source.slice(0, match.index);
    const line = before.split(/\r?\n/).length;
    const column = before.length - before.lastIndexOf("\n");
    return { line, column, text: match[0] };
  });
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

function isGitRepo(target) {
  try {
    execFileSync("git", ["-C", target, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function assertDirectory(target) {
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Target directory does not exist: ${target}`);
  }
}

function parseArgs(argv) {
  const options = { apply: false, install: false, checks: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target" || arg === "-t") options.target = argv[++index];
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--install") options.install = true;
    else if (arg === "--report") options.report = argv[++index];
    else if (arg === "--patch") options.patch = argv[++index];
    else if (arg === "--check") options.checks.push(argv[++index]);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node scripts/migration-pipeline.mjs --target <repo> [--dry-run]
  node scripts/migration-pipeline.mjs --target <repo> --apply [--install] [--check "npm test"]

Options:
  --target, -t   Target repository path
  --dry-run      Analyze and write a report without modifying files (default)
  --apply        Apply manifest edits and run the Codemod workflow
  --install      Run the detected package manager install command after manifest edits
  --check        Validation command to run after apply; repeatable
  --report       Report output path (default: target/solana-compat-pilot-report.json)
  --patch        Rollback patch output path (default: target/solana-compat-pilot.rollback.patch)
`);
}

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
