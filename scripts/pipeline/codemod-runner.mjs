import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export function runCodemod(target) {
  const workflowPath = join(repoRoot, "workflow.yaml");
  const command = `npx codemod workflow run -w "${workflowPath}" -t "${target}" --allow-dirty --no-interactive`;

  try {
    const output = execSync(command, { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
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
