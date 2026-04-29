import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { isGitRepo } from "./git-check.mjs";

export function createRollbackPatch(target, patchPath) {
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

/**
 * Replays a rollback patch produced by createRollbackPatch (for tests and tooling).
 * Requires a clean git index except for the applied changes being reversed.
 */
export function applyRollbackPatchSync(target, patchPath) {
  if (!existsSync(patchPath)) {
    throw new Error(`Rollback patch not found: ${patchPath}`);
  }
  execFileSync("git", ["-C", target, "apply", "--whitespace=nowarn", "-R", patchPath], {
    encoding: "utf8",
    stdio: "pipe",
  });
}
