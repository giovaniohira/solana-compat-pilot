import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  analyzeSourceFile,
  analyzeTarget,
  applyManifestPlan,
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
  const report = await runPipeline({ target, apply: true, report: reportPath, patch: patchPath });

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
