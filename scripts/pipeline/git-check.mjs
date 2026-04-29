import { execFileSync } from "node:child_process";

export function isGitRepo(target) {
  try {
    execFileSync("git", ["-C", target, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function assertCleanGitTarget(target, allowDirty) {
  if (allowDirty || !isGitRepo(target)) return;

  const status = execFileSync("git", ["-C", target, "status", "--porcelain"], { encoding: "utf8" });
  if (status.trim()) {
    throw new Error("Target git repository has uncommitted changes. Commit/stash them or pass --allow-dirty.");
  }
}
