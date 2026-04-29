import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

import { DEFAULT_REPORT_PATH_EXCLUSIONS, IGNORE_DIRS, SOURCE_EXTENSIONS } from "./constants.mjs";
import { normalizePath, sum } from "./fs-utils.mjs";
import { analyzePackageJson, detectPackageManager } from "./manifest.mjs";

export function analyzeTarget(target, scanOptions = {}) {
  const sourceFiles = listSourceFiles(target, scanOptions);
  const files = sourceFiles.map((filePath) => analyzeSourceFile(target, filePath));
  const packageJsonPath = join(target, "package.json");

  return {
    packageManager: detectPackageManager(target),
    packageJson: existsSync(packageJsonPath) ? analyzePackageJson(packageJsonPath) : null,
    files,
    summary: {
      sourceFilesScanned: sourceFiles.length,
      filesWithLegacySolanaImports: files.filter((file) => file.legacyImports > 0).length,
      legacyImportReferences: sum(files, "legacyImports"),
      dynamicImportReferences: sum(files, "dynamicImports"),
      hotspotCount: files.reduce((total, file) => total + file.hotspots.length, 0),
      existingMarkers: files.filter((file) => file.hasExistingMarker).length,
    },
  };
}

export function listSourceFiles(target, scanOptions = {}) {
  const files = [];
  walk(target, files, target, scanOptions);
  return files.sort();
}

export function analyzeSourceFile(target, filePath) {
  const source = readFileSync(filePath, "utf8");
  const relPath = normalizePath(relative(target, filePath));
  const legacyImports = findMatches(source, /(?:from\s*|import\s*\(|require\s*\()\s*["']@solana\/web3\.js["']/g);
  const dynamicImports = findMatches(source, /import\s*\(\s*["']@solana\/web3\.js["']\s*\)/g);
  const hotspots = collectAstHotspots(source, filePath);

  const hasExistingMarker = source.includes("SOLANA_COMPAT_PILOT");

  return {
    path: relPath,
    confidence: hasExistingMarker || (legacyImports.length > 0 && hotspots.length > 0)
      ? "needs-review"
      : legacyImports.length > 0
        ? "safe"
        : "none",
    legacyImports: legacyImports.length,
    dynamicImports: dynamicImports.length,
    hasExistingMarker,
    hotspots,
  };
}

export function buildScanOptions(options) {
  return {
    extraExcludeGlobs: options.excludeGlobs ?? [],
    includeTestDirs: Boolean(options.includeTestDirs),
  };
}

function walk(directory, files, targetRoot, scanOptions) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(fullPath, files, targetRoot, scanOptions);
      continue;
    }

    if (stats.isFile() && SOURCE_EXTENSIONS.has(extname(entry))) {
      const relPath = normalizePath(relative(targetRoot, fullPath));
      if (isReportScanExcluded(relPath, scanOptions)) continue;
      files.push(fullPath);
    }
  }
}

function isReportScanExcluded(relPosix, scanOptions) {
  const extra = scanOptions?.extraExcludeGlobs ?? [];
  const includeTestDirs = Boolean(scanOptions?.includeTestDirs);

  if (!includeTestDirs && DEFAULT_REPORT_PATH_EXCLUSIONS.some((re) => re.test(relPosix))) {
    return true;
  }

  for (const pattern of extra) {
    if (userGlobMatch(relPosix, pattern)) return true;
  }

  return false;
}

function userGlobMatch(relPosix, pattern) {
  const normalized = pattern.replaceAll("\\", "/");
  if (!normalized.includes("*")) {
    return (
      relPosix === normalized
      || relPosix.startsWith(`${normalized}/`)
      || relPosix.includes(`/${normalized}/`)
      || relPosix.endsWith(`/${normalized}`)
    );
  }

  return globPatternToRegExp(normalized).test(relPosix);
}

function globPatternToRegExp(pattern) {
  if (pattern.startsWith("**/") && pattern.endsWith("/**") && pattern.length > 6) {
    const mid = pattern.slice(3, -3).replace(/[.+^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^(.*/)?${mid}(/.*)?$`);
  }

  const body = pattern
    .split("**")
    .map((segment) => segment.split("*").map((literal) => literal.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("[^/]*"))
    .join(".*");

  return new RegExp(`^${body}$`);
}

function collectAstHotspots(source, filePath) {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const hotspots = [];
  const seen = new Set();

  function addHotspot(kind, reason, node) {
    const key = `${kind}:${node.getStart(sourceFile)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    hotspots.push({
      kind,
      reason,
      line: line + 1,
      column: character + 1,
      text: node.getText(sourceFile),
    });
  }

  visit(sourceFile, (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === "Connection") {
        addHotspot("Connection", "Connection may need createSolanaRpc review.", node.expression);
      } else if (name === "PublicKey" || name.endsWith("PublicKey")) {
        addHotspot("PublicKey", "PublicKey may need address() or compat object semantics.", node.expression);
      } else if (name === "Transaction") {
        addHotspot("Transaction", "Mutable transactions need transaction-message review.", node.expression);
      }
    }

    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Keypair") {
      addHotspot("Keypair", "Keypair to Kit signer changes may require async flow changes.", node.name);
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const prop = node.expression.name;
      if (ts.isIdentifier(prop) && /^on[A-Za-z]+Change$/.test(prop.text)) {
        addHotspot("Subscription", "Subscriptions need createSolanaRpcSubscriptions review.", prop);
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "sendAndConfirmTransaction") {
      addHotspot("sendAndConfirmTransaction", "Submission flow may need Kit signing/send pipeline changes.", node.expression);
    }
  });

  return hotspots;
}

function scriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function findMatches(source, regex) {
  return [...source.matchAll(regex)].map((match) => {
    const before = source.slice(0, match.index);
    const line = before.split(/\r?\n/).length;
    const column = before.length - before.lastIndexOf("\n");
    return { line, column, text: match[0] };
  });
}
