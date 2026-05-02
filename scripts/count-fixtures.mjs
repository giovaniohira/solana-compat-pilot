#!/usr/bin/env node
/**
 * Counts JSSG fixture pairs (input.ts + expected.ts) under ./tests for BUIDL/judge metrics.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const testsRoot = join(__dirname, "..", "tests");

/** @type {string[]} */
const pairs = [];

/**
 * @param {string} dir
 */
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
  }
  const input = join(dir, "input.ts");
  const expected = join(dir, "expected.ts");
  if (existsSync(input) && existsSync(expected) && statSync(input).isFile() && statSync(expected).isFile()) {
    pairs.push(relative(testsRoot, dir));
  }
}

walk(testsRoot);
pairs.sort();

console.log(`JSSG fixture pairs (input.ts + expected.ts): ${pairs.length}`);
for (const rel of pairs) {
  console.log(`  - ${rel}`);
}
process.exit(0);
