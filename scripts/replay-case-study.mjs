/**
 * Regenerates committed case-study artifacts from a disposable temp target.
 * Run from repo root: npm run case-study:replay
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runPipeline } from "./pipeline/orchestrate.mjs";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const artifactsDir = join(repoRoot, "case-study", "artifacts");
mkdirSync(artifactsDir, { recursive: true });

const target = mkdtempSync(join(tmpdir(), "solana-compat-case-study-"));
try {
  writeFileSync(
    join(target, "package.json"),
    `${JSON.stringify(
      {
        name: "case-study-sample",
        version: "0.0.0",
        private: true,
        dependencies: { "@solana/web3.js": "^1.95.0" },
      },
      null,
      2,
    )}\n`,
  );
  mkdirSync(join(target, "src"), { recursive: true });
  writeFileSync(
    join(target, "src", "entry.ts"),
    'import { Connection, PublicKey } from "@solana/web3.js";\n'
      + 'export const pk = new PublicKey("11111111111111111111111111111111");\n'
      + 'export const conn = new Connection("https://api.devnet.solana.com");\n',
  );

  const dryReportPath = join(artifactsDir, "dry-run.report.json");
  const dry = await runPipeline({ target, report: dryReportPath });
  const redacted = { ...dry, target: "<temporary-sample-target>" };
  writeFileSync(dryReportPath, `${JSON.stringify(redacted, null, 2)}\n`);
  writeFileSync(join(artifactsDir, "dry-run.summary.json"), `${JSON.stringify(dry.summary, null, 2)}\n`);

  console.log(`Wrote ${dryReportPath} (target path redacted)`);
  console.log(readFileSync(dryReportPath, "utf8").slice(0, 400) + "…");
} finally {
  rmSync(target, { recursive: true, force: true });
}
