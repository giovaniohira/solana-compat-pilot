import { existsSync } from "node:fs";
import { join } from "node:path";

import { LEGACY_PACKAGE, REQUIRED_PACKAGES } from "./constants.mjs";
import { readJson, writeJson } from "./fs-utils.mjs";

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

export function detectInstallCommand(target) {
  const manager = detectPackageManager(target);
  if (manager === "pnpm") return "pnpm install";
  if (manager === "yarn") return "yarn install";
  if (manager === "bun") return "bun install";
  return "npm install";
}

export function detectPackageManager(target) {
  if (existsSync(join(target, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(target, "yarn.lock"))) return "yarn";
  if (existsSync(join(target, "bun.lockb")) || existsSync(join(target, "bun.lock"))) return "bun";
  if (existsSync(join(target, "package-lock.json"))) return "npm";
  return "unknown";
}

export function hasLockfile(target) {
  return ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"].some((name) =>
    existsSync(join(target, name)),
  );
}

export function analyzePackageJson(packageJsonPath) {
  const packageJson = readJson(packageJsonPath);
  return {
    hasLegacyDependency: hasDependency(packageJson, LEGACY_PACKAGE),
    hasCompatDependency: hasDependency(packageJson, "@solana/web3-compat"),
    hasKitDependency: hasDependency(packageJson, "@solana/kit"),
    hasClientDependency: hasDependency(packageJson, "@solana/client"),
    workspaces: Boolean(packageJson.workspaces),
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
