import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  applyDirectKitTransforms,
  analyzeSourceFile,
  analyzeTarget,
  applyManifestPlan,
  applyRollbackPatchSync,
  createRollbackPatch,
  listWorkspacePackageJsonPaths,
  planManifestMigration,
  runPipeline,
} from "../../scripts/migration-pipeline.mjs";

test("plans Solana compat dependencies in the same section as legacy dependency", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
  });

  const plan = planManifestMigration(target);

  assert.equal(plan.changed, true);
  assert.deepEqual(
    plan.changes.map((change) => change.name),
    ["@solana/web3-compat", "@solana/kit", "@solana/client"],
  );
  assert.equal(plan.changes.every((change) => change.section === "dependencies"), true);
});

test("does not edit package manifests without legacy Solana dependency", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { react: "^19.0.0" },
    }),
  });

  const plan = planManifestMigration(target);

  assert.equal(plan.changed, false);
  assert.equal(plan.changes.length, 0);
});

test("applies package manifest plan without removing @solana/web3.js", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      devDependencies: { "@solana/web3.js": "^1.95.0" },
    }),
  });

  applyManifestPlan(planManifestMigration(target));
  const packageJson = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));

  assert.equal(packageJson.devDependencies["@solana/web3.js"], "^1.95.0");
  assert.equal(packageJson.devDependencies["@solana/web3-compat"], "^0.0.21");
  assert.equal(packageJson.devDependencies["@solana/kit"], "^6.8.0");
  assert.equal(packageJson.devDependencies["@solana/client"], "^1.7.0");
});

test("dry-run writes a report and leaves target files unchanged", async () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
    "src/index.ts": 'import { PublicKey } from "@solana/web3.js";\nnew PublicKey("11111111111111111111111111111111");\n',
  });
  const reportPath = join(target, "report.json");

  const report = await runPipeline({ target, report: reportPath });

  assert.equal(report.mode, "dry-run");
  assert.equal(report.summary.sourceFilesWithLegacySolanaImportsBefore, 1);
  assert.equal(existsSync(reportPath), true);
  assert.match(readFileSync(join(target, "src/index.ts"), "utf8"), /@solana\/web3\.js/);
});

test("apply mode updates manifests, runs codemod, writes report, and creates rollback patch", async () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
    "src/index.ts": 'import { PublicKey } from "@solana/web3.js";\nnew PublicKey("11111111111111111111111111111111");\n',
  });
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Test Runner", "-c", "user.email=test@example.com", "commit", "-m", "baseline"], {
    cwd: target,
    stdio: "ignore",
  });

  const reportPath = join(target, "report.json");
  const patchPath = join(target, "rollback.patch");
  const report = await runPipeline({
    target,
    apply: true,
    report: reportPath,
    patch: patchPath,
    checks: ['node -e "process.exit(0)"'],
  });

  assert.equal(report.mode, "apply");
  assert.equal(report.rollback.available, true);
  assert.equal(report.summary.filesNeedingReview, 1);
  assert.equal(existsSync(patchPath), true);
  assert.match(readFileSync(join(target, "src/index.ts"), "utf8"), /@solana\/web3-compat/);
  assert.equal(JSON.parse(readFileSync(join(target, "package.json"), "utf8")).dependencies["@solana/client"], "^1.7.0");
});

test("analysis reports dynamic imports and hotspot confidence", () => {
  const target = makeTarget({
    "src/index.ts": 'const mod = await import("@solana/web3.js");\nconst c = new Connection("http://localhost:8899");\n',
  });

  const analysis = analyzeTarget(target);
  const file = analyzeSourceFile(target, join(target, "src/index.ts"));

  assert.equal(analysis.summary.dynamicImportReferences, 1);
  assert.equal(file.confidence, "needs-review");
  assert.equal(file.hotspots.some((hotspot) => hotspot.kind === "Connection"), true);
});

test("apply mode requires at least one check unless skip-validation is set", async () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
    "src/index.ts": 'import { PublicKey } from "@solana/web3.js";\n',
  });
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Test Runner", "-c", "user.email=test@example.com", "commit", "-m", "baseline"], {
    cwd: target,
    stdio: "ignore",
  });

  await assert.rejects(
    () => runPipeline({ target, apply: true, report: join(target, "report.json") }),
    /requires at least one --check/,
  );
});

test("apply mode refuses dirty git targets unless explicitly allowed", async () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
    "src/index.ts": 'import { PublicKey } from "@solana/web3.js";\n',
  });
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Test Runner", "-c", "user.email=test@example.com", "commit", "-m", "baseline"], {
    cwd: target,
    stdio: "ignore",
  });
  writeFileSync(join(target, "src/index.ts"), 'import { PublicKey } from "@solana/web3.js";\nconsole.log(PublicKey);\n');

  await assert.rejects(
    () => runPipeline({ target, apply: true, report: join(target, "report.json") }),
    /uncommitted changes/,
  );
});

test("direct Kit transform rewrites only safe PublicKey string literals", () => {
  const target = makeTarget({
    "src/index.ts": [
      'import { PublicKey } from "@solana/web3-compat";',
      "",
      'const owner = new PublicKey("11111111111111111111111111111111");',
      "console.log(owner);",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["public-key-literals"]);
  const source = readFileSync(join(target, "src/index.ts"), "utf8");

  assert.equal(result.filesChanged, 1);
  assert.match(source, /import \{ address \} from "@solana\/kit";/);
  assert.match(source, /const owner = address\("11111111111111111111111111111111"\);/);
  assert.doesNotMatch(source, /PublicKey/);
});

test("analysis excludes default test and fixture directories from scanned files", () => {
  const target = makeTarget({
    "src/prod.ts": 'import { PublicKey } from "@solana/web3.js";\n',
    "tests/legacy.test.ts": 'import { PublicKey } from "@solana/web3.js";\n',
    "fixtures/sample.ts": 'import { PublicKey } from "@solana/web3.js";\n',
  });

  const analysis = analyzeTarget(target);

  assert.equal(analysis.summary.sourceFilesScanned, 1);
  assert.equal(analysis.files.length, 1);
  assert.equal(analysis.files[0].path, "src/prod.ts");
});

test("analysis honors extra exclude globs", () => {
  const target = makeTarget({
    "src/prod.ts": 'import { PublicKey } from "@solana/web3.js";\n',
    "vendor/legacy.ts": 'import { PublicKey } from "@solana/web3.js";\n',
  });

  const analysis = analyzeTarget(target, { extraExcludeGlobs: ["**/vendor/**"], includeTestDirs: false });

  assert.equal(analysis.summary.sourceFilesScanned, 1);
  assert.equal(analysis.files[0].path, "src/prod.ts");
});

test("direct Kit transform rewrites only safe Connection string literals", () => {
  const target = makeTarget({
    "src/index.ts": [
      'import { Connection } from "@solana/web3-compat";',
      "",
      'const rpc = new Connection("https://api.devnet.solana.com");',
      "console.log(rpc);",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["connection-string-literals"]);
  const source = readFileSync(join(target, "src/index.ts"), "utf8");

  assert.equal(result.filesChanged, 1);
  assert.match(source, /import \{ createSolanaRpc \} from "@solana\/kit";/);
  assert.match(source, /const rpc = createSolanaRpc\("https:\/\/api\.devnet\.solana\.com"\);/);
  assert.doesNotMatch(source, /\bConnection\b/);
});

test("direct Kit transform skips Connection files with RPC member usage", () => {
  const target = makeTarget({
    "src/index.ts": [
      'import { Connection } from "@solana/web3-compat";',
      "",
      'const rpc = new Connection("https://api.devnet.solana.com");',
      "void rpc.getLatestBlockhash();",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["connection-string-literals"]);
  const source = readFileSync(join(target, "src/index.ts"), "utf8");

  assert.equal(result.filesChanged, 0);
  assert.match(source, /new Connection/);
});

test("rollback patch reverses an uncommitted edit on a clean git baseline", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({ name: "t", version: "1.0.0", private: true }),
    "src/note.txt": "baseline\n",
  });
  execFileSync("git", ["init"], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: target, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Test Runner", "-c", "user.email=test@example.com", "commit", "-m", "baseline"], {
    cwd: target,
    stdio: "ignore",
  });

  const baseline = readFileSync(join(target, "src/note.txt"), "utf8");
  writeFileSync(join(target, "src/note.txt"), "mutated\n");

  const patchPath = join(target, "rollback.patch");
  const rollback = createRollbackPatch(target, patchPath);
  assert.equal(rollback.available, true);

  applyRollbackPatchSync(target, patchPath);
  const restored = readFileSync(join(target, "src/note.txt"), "utf8").replaceAll("\r\n", "\n");
  assert.equal(restored, baseline.replaceAll("\r\n", "\n"));
});

test("dry-run report includes schema 1.2, AST hotspot metadata, and false-negative ledger", async () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
    "src/index.ts": 'import { Connection } from "@solana/web3.js";\nnew Connection("http://127.0.0.1:8899");\n',
  });
  const reportPath = join(target, "report.json");
  const report = await runPipeline({ target, report: reportPath });

  assert.equal(report.schemaVersion, "1.2");
  assert.ok(Array.isArray(report.manifest.manifests));
  assert.equal(report.migrationLimits.hotspotDetection, "typescript-ast");
  assert.ok(Array.isArray(report.knownFalseNegativeCategories));
  assert.ok(report.knownFalseNegativeCategories.length >= 3);
  assert.ok(typeof report.validationShellRisk === "string");
});

test("detects pnpm and yarn install commands from lockfiles", () => {
  const pnpmTarget = makeTarget({
    "package.json": JSON.stringify({ dependencies: { "@solana/web3.js": "^1.0.0" } }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  });
  const yarnTarget = makeTarget({
    "package.json": JSON.stringify({ dependencies: { "@solana/web3.js": "^1.0.0" } }),
    "yarn.lock": "# yarn lockfile v1\n",
  });

  assert.equal(analyzeTarget(pnpmTarget).packageManager, "pnpm");
  assert.equal(analyzeTarget(yarnTarget).packageManager, "yarn");
  assert.equal(planManifestMigration(pnpmTarget).installCommand, "pnpm install");
  assert.equal(planManifestMigration(yarnTarget).installCommand, "yarn install");
});

test("plans root manifest when npm workspaces are declared", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      name: "mono",
      private: true,
      workspaces: ["packages/*"],
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
  });

  const plan = planManifestMigration(target);
  const analysis = analyzeTarget(target);

  assert.equal(plan.changed, true);
  assert.equal(analysis.packageJson.workspaces, true);
});

test("plans and applies manifests in nested workspaces when legacy web3 is only in a package", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({
      name: "mono",
      private: true,
      workspaces: ["packages/*"],
    }),
    "packages/a/package.json": JSON.stringify({
      name: "pkg-a",
      version: "1.0.0",
      dependencies: { "@solana/web3.js": "^1.95.0" },
    }),
  });

  const discovered = listWorkspacePackageJsonPaths(target).map((p) => p.replaceAll("\\", "/"));
  assert.ok(discovered.some((p) => p.endsWith("packages/a/package.json")));

  const plan = planManifestMigration(target);
  assert.equal(plan.changed, true);
  assert.equal(plan.plans.length, 1);
  applyManifestPlan(plan);

  const child = JSON.parse(readFileSync(join(target, "packages/a", "package.json"), "utf8"));
  assert.equal(child.dependencies["@solana/web3-compat"], "^0.0.21");
});

test("lists workspaces from pnpm-workspace.yaml when npm workspaces array is absent", () => {
  const target = makeTarget({
    "package.json": JSON.stringify({ name: "r", private: true }),
    "pnpm-workspace.yaml": `packages:\n  - 'packages/*'\n`,
    "packages/foo/package.json": JSON.stringify({ name: "f", version: "0.0.0" }),
  });

  assert.equal(listWorkspacePackageJsonPaths(target).length, 1);
});

test("direct Kit websocket transform rewrites wss Connection literals without member usage", () => {
  const target = makeTarget({
    "src/ws.ts": [
      'import { Connection } from "@solana/web3-compat";',
      "",
      'const sub = new Connection("wss://api.devnet.solana.com");',
      "console.log(sub);",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["websocket-connection-literals"]);
  const source = readFileSync(join(target, "src/ws.ts"), "utf8");

  assert.equal(result.filesChanged, 1);
  assert.match(source, /import \{ createSolanaRpcSubscriptions \} from "@solana\/kit";/);
  assert.match(source, /createSolanaRpcSubscriptions\("wss:\/\/api.devnet.solana.com"\)/);
});

test("direct Kit websocket transform skips when Connection has member usage", () => {
  const target = makeTarget({
    "src/ws.ts": [
      'import { Connection } from "@solana/web3-compat";',
      "",
      'const sub = new Connection("wss://example.com");',
      "void sub.onAccountChange(null, () => {});",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["websocket-connection-literals"]);
  const source = readFileSync(join(target, "src/ws.ts"), "utf8");

  assert.equal(result.filesChanged, 0);
  assert.match(source, /new Connection/);
});

test("direct Kit transform skips PublicKey files with object API usage", () => {
  const target = makeTarget({
    "src/index.ts": [
      'import { PublicKey } from "@solana/web3-compat";',
      "",
      'const owner = new PublicKey("11111111111111111111111111111111");',
      "console.log(owner.toBase58());",
    ].join("\n"),
  });

  const result = applyDirectKitTransforms(target, ["public-key-literals"]);
  const source = readFileSync(join(target, "src/index.ts"), "utf8");

  assert.equal(result.filesChanged, 0);
  assert.match(source, /new PublicKey/);
});

function makeTarget(files) {
  const target = mkdtempSync(join(tmpdir(), "solana-compat-pilot-test-"));

  for (const [fileName, content] of Object.entries(files)) {
    const path = join(target, fileName);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${content}\n`);
  }

  test.after(() => rmSync(target, { recursive: true, force: true }));
  return target;
}
