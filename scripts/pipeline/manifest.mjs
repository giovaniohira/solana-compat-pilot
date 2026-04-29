import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { LEGACY_PACKAGE, REQUIRED_PACKAGES } from "./constants.mjs";
import { normalizePath, readJson, writeJson } from "./fs-utils.mjs";

export function planManifestMigration(target) {
  const normalizedTarget = resolve(target);

  const plans = [];

  const rootPlan = planSingleManifest(join(normalizedTarget, "package.json"), normalizedTarget);
  plans.push(rootPlan);

  for (const wsPath of listWorkspacePackageJsonPaths(normalizedTarget)) {
    if (resolve(wsPath) === resolve(rootPlan.packageJsonPath)) continue;
    plans.push(planSingleManifest(wsPath, normalizedTarget));
  }

  const changed = plans.some((p) => p.exists && p.changed);
  const aggregatedChanges = plans.flatMap((p) =>
    p.changed && p.exists
      ? p.changes.map((change) => ({
        ...change,
        file: normalizePath(relative(normalizedTarget, p.packageJsonPath)),
      }))
      : [],
  );

  return {
    packageJsonPath: rootPlan.packageJsonPath,
    manifests: plans.map((plan) => ({
      packageJsonPath:
        plan.exists && plan.packageJsonPath
          ? normalizePath(relative(normalizedTarget, plan.packageJsonPath))
          : plan.packageJsonPath,
      exists: plan.exists,
      changed: Boolean(plan.exists && plan.changed),
      changes:
        plan.changed && plan.exists
          ? plan.changes.map((change) => ({
            ...change,
            file: normalizePath(relative(normalizedTarget, plan.packageJsonPath)),
          }))
          : [],
    })),
    exists: rootPlan.exists,
    changed,
    changes: aggregatedChanges,
    plans: plans.filter((p) => p.exists && p.changed && p.nextPackageJson),
    lockfileRefreshRequired: changed && hasLockfile(normalizedTarget),
    installCommand: changed ? detectInstallCommand(normalizedTarget) : null,
  };
}

export function applyManifestPlan(plan) {
  if (Array.isArray(plan.plans) && plan.plans.length > 0) {
    for (const fragment of plan.plans) {
      writeJson(fragment.packageJsonPath, fragment.nextPackageJson);
    }
    return;
  }
  if (plan.exists && plan.changed && plan.nextPackageJson) {
    writeJson(plan.packageJsonPath, plan.nextPackageJson);
  }
}

/**
 * Paths to nested workspace package manifests (excluding the root duplicate).
 */
export function listWorkspacePackageJsonPaths(target) {
  const rootJson = join(target, "package.json");
  if (!existsSync(rootJson)) return [];

  let patterns = [];
  try {
    const packageJson = readJson(rootJson);
    patterns.push(...workspacePatternsFromPackageJson(packageJson));
  } catch {
    patterns = [];
  }

  const pnpmYaml = join(target, "pnpm-workspace.yaml");
  const pnpmYml = join(target, "pnpm-workspace.yml");
  if (existsSync(pnpmYaml)) patterns.push(...patternsFromPnpmWorkspaceFile(readFileSync(pnpmYaml, "utf8")));
  else if (existsSync(pnpmYml)) patterns.push(...patternsFromPnpmWorkspaceFile(readFileSync(pnpmYml, "utf8")));

  patterns = [...new Set(patterns)];

  const seen = new Set();
  const result = [];

  const rootNormalized = normalizePath(resolve(join(target, "package.json"))).toLowerCase();

  for (const pattern of patterns) {
    for (const pkgRoot of expandWorkspacePatternSegments(target, pattern)) {
      const pkgJsonPath = join(pkgRoot, "package.json");
      const key = normalizePath(resolve(pkgJsonPath)).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!existsSync(pkgJsonPath)) continue;
      if (key === rootNormalized) continue;
      result.push(pkgJsonPath);
    }
  }

  return result;
}

export function workspacePatternsFromPackageJson(packageJson) {
  const out = [];
  const ws = packageJson.workspaces;
  if (!ws) return out;
  if (Array.isArray(ws)) out.push(...ws.map(String));
  else if (typeof ws === "object" && Array.isArray(ws.packages)) out.push(...ws.packages.map(String));
  return out;
}

function patternsFromPnpmWorkspaceFile(contents) {
  const out = [];
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.replace(/#.*/, "").trim();
    if (!trimmed.startsWith("-")) continue;
    const rest = trimmed.slice(1).trim().replace(/^['"]+|['"]+$/g, "");
    if (rest.length > 0) out.push(rest);
  }
  return out;
}

function expandWorkspacePatternSegments(target, pattern) {
  const posix = normalizePath(pattern.trim()).replaceAll("\\", "/");

  const starSegments = posix.split("/").filter((segment) => segment.includes("*")).length;

  const expandOne = (fromRoot, pat) => {
    if (!pat.includes("*")) {
      const full = resolve(fromRoot, pat);
      if (existsSync(join(full, "package.json"))) return [full];
      return [];
    }

    if (starSegments > 1) return [];

    const starIndex = pat.indexOf("*");
    const prefixRaw = starIndex <= 0 ? "" : pat.slice(0, Math.max(starIndex - 1, 0));
    const suffix = pat.slice(starIndex + 1);
    let parentRel = prefixRaw.endsWith("/") ? prefixRaw.slice(0, -1) : prefixRaw;
    if (parentRel.startsWith("./")) parentRel = parentRel.slice(2);
    if (suffix !== "" && suffix !== "/") return [];

    const parentAbs = resolve(fromRoot, parentRel === "" ? "." : parentRel);
    if (!existsSync(parentAbs) || !statSync(parentAbs).isDirectory()) return [];

    const out = [];

    try {
      for (const entry of readdirSync(parentAbs)) {
        const dirPath = join(parentAbs, entry);
        try {
          if (!statSync(dirPath).isDirectory()) continue;
        } catch {
          continue;
        }
        const candidate = resolve(dirPath);
        if (existsSync(join(candidate, "package.json"))) out.push(candidate);
      }
    } catch {
      return [];
    }

    return out;
  };

  return expandOne(target, posix);
}

function planSingleManifest(packageJsonPath, targetRoot) {
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
    lockfileRefreshRequired: changes.length > 0 && hasLockfile(targetRoot),
    installCommand: changes.length > 0 ? detectInstallCommand(targetRoot) : null,
  };
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
  const packageRoot = dirname(packageJsonPath);
  const packageJson = readJson(packageJsonPath);
  return {
    hasLegacyDependency: hasDependency(packageJson, LEGACY_PACKAGE),
    hasCompatDependency: hasDependency(packageJson, "@solana/web3-compat"),
    hasKitDependency: hasDependency(packageJson, "@solana/kit"),
    hasClientDependency: hasDependency(packageJson, "@solana/client"),
    workspaces: Boolean(
      workspacePatternsFromPackageJson(packageJson).length > 0
        || existsSync(join(packageRoot, "pnpm-workspace.yaml"))
        || existsSync(join(packageRoot, "pnpm-workspace.yml")),
    ),
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
