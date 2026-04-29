import { execSync } from "node:child_process";

export function runCommand(target, command, kind) {
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
