import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import ts from "typescript";

import { DIRECT_KIT_TRANSFORMS } from "./constants.mjs";
import { normalizePath } from "./fs-utils.mjs";
import { listSourceFiles } from "./scan.mjs";

export function applyDirectKitTransforms(target, transforms = [], scanOptions = {}) {
  assertDirectKitTransforms(transforms);

  if (transforms.length === 0) {
    return { status: "skipped", transforms, filesChanged: 0, changes: [], error: null };
  }

  const changes = [];
  const files = listSourceFiles(target, scanOptions);

  for (const filePath of files) {
    if (transforms.includes("public-key-literals")) {
      const change = applyPublicKeyLiteralTransform(target, filePath);
      if (change) changes.push(change);
    }
    if (transforms.includes("connection-string-literals")) {
      const change = applyConnectionStringLiteralTransform(target, filePath);
      if (change) changes.push(change);
    }
    if (transforms.includes("websocket-connection-literals")) {
      const change = applyWebsocketConnectionLiteralTransform(target, filePath);
      if (change) changes.push(change);
    }
  }

  const uniquePaths = new Set(changes.map((change) => change.path));

  return {
    status: "ok",
    transforms,
    filesChanged: uniquePaths.size,
    changes,
    error: null,
  };
}

function assertDirectKitTransforms(transforms) {
  const invalid = transforms.filter((transform) => !DIRECT_KIT_TRANSFORMS.has(transform));
  if (invalid.length > 0) {
    throw new Error(`Unknown direct Kit transform: ${invalid.join(", ")}`);
  }
}

function applyPublicKeyLiteralTransform(target, filePath) {
  const source = readFileSync(filePath, "utf8");
  if (!source.includes("PublicKey") || !source.includes("@solana/web3-compat")) return null;

  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const compatImport = findNamedImport(sourceFile, "@solana/web3-compat", "PublicKey");
  if (!compatImport || compatImport.isTypeOnly || compatImport.isAliased) return null;

  const safeConstructors = [];
  const unsafePublicKeyUses = [];

  visit(sourceFile, (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "PublicKey") {
      const [argument] = node.arguments ?? [];
      if ((node.arguments?.length ?? 0) === 1 && isStringLikeLiteral(argument)) {
        safeConstructors.push(node);
      } else {
        unsafePublicKeyUses.push(node.expression);
      }
      return;
    }

    if (ts.isIdentifier(node) && node.text === "PublicKey" && !isImportSpecifierName(node, compatImport.specifier)) {
      unsafePublicKeyUses.push(node);
    }
  });

  const constructedNames = new Set(safeConstructors.map((node) => constructedVariableName(node)).filter(Boolean));
  visit(sourceFile, (node) => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && ts.isIdentifier(node.expression)
      && constructedNames.has(node.expression.text)
    ) {
      unsafePublicKeyUses.push(node.expression);
    }
  });

  if (safeConstructors.length === 0 || unsafePublicKeyUses.length > safeConstructors.length) return null;

  const edits = safeConstructors.map((node) => {
    const [argument] = node.arguments;
    return {
      start: node.getStart(sourceFile),
      end: node.end,
      text: `address(${argument.getText(sourceFile)})`,
    };
  });

  const kitImport = findImportDeclaration(sourceFile, "@solana/kit");
  const hasAddressImport = Boolean(findNamedImport(sourceFile, "@solana/kit", "address"));
  const compatReplacement = removeNamedImportFromDeclaration(sourceFile, source, compatImport.declaration, "PublicKey", eol);

  if (!hasAddressImport && kitImport) {
    const kitReplacement = addNamedImportToDeclaration(sourceFile, kitImport, "address");
    if (kitReplacement) {
      edits.push({ start: kitImport.getStart(sourceFile), end: kitImport.end, text: kitReplacement });
    }
  }

  const importReplacement = !hasAddressImport && !kitImport
    ? `import { address } from "@solana/kit";${eol}${compatReplacement}`
    : compatReplacement;

  edits.push({
    start: compatImport.declaration.getStart(sourceFile),
    end: includeTrailingLineBreak(source, compatImport.declaration.end),
    text: importReplacement,
  });

  writeFileSync(filePath, applyTextEdits(source, edits));

  return {
    path: normalizePath(relative(target, filePath)),
    transform: "public-key-literals",
    replacements: safeConstructors.length,
    confidence: "high",
    reason: "Only unaliased PublicKey imports whose usages are string-literal constructors are rewritten to Kit address().",
  };
}

function applyConnectionStringLiteralTransform(target, filePath) {
  const source = readFileSync(filePath, "utf8");
  if (!source.includes("Connection") || !source.includes("@solana/web3-compat")) return null;

  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const compatImport = findNamedImport(sourceFile, "@solana/web3-compat", "Connection");
  if (!compatImport || compatImport.isTypeOnly || compatImport.isAliased) return null;

  const safeConstructors = [];
  const unsafeConnectionUses = [];

  visit(sourceFile, (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Connection") {
      const args = node.arguments ?? [];
      if (args.length === 1 && isStringLikeLiteral(args[0])) {
        if (isWebsocketUrlLiteral(args[0], sourceFile)) {
          unsafeConnectionUses.push(node.expression);
          return;
        }
        safeConstructors.push(node);
      } else {
        unsafeConnectionUses.push(node.expression);
      }
      return;
    }

    if (ts.isIdentifier(node) && node.text === "Connection" && !isImportSpecifierName(node, compatImport.specifier)) {
      unsafeConnectionUses.push(node);
    }
  });

  const constructedNames = new Set(safeConstructors.map((node) => constructedVariableName(node)).filter(Boolean));
  visit(sourceFile, (node) => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && ts.isIdentifier(node.expression)
      && constructedNames.has(node.expression.text)
    ) {
      unsafeConnectionUses.push(node.expression);
    }
  });

  if (safeConstructors.length === 0 || unsafeConnectionUses.length > safeConstructors.length) return null;

  const edits = safeConstructors.map((node) => {
    const [argument] = node.arguments;
    return {
      start: node.getStart(sourceFile),
      end: node.end,
      text: `createSolanaRpc(${argument.getText(sourceFile)})`,
    };
  });

  const kitImport = findImportDeclaration(sourceFile, "@solana/kit");
  const hasRpcImport = Boolean(findNamedImport(sourceFile, "@solana/kit", "createSolanaRpc"));
  const compatReplacement = removeNamedImportFromDeclaration(sourceFile, source, compatImport.declaration, "Connection", eol);

  if (!hasRpcImport && kitImport) {
    const kitReplacement = addNamedImportToDeclaration(sourceFile, kitImport, "createSolanaRpc");
    if (kitReplacement) {
      edits.push({ start: kitImport.getStart(sourceFile), end: kitImport.end, text: kitReplacement });
    }
  }

  const importReplacement = !hasRpcImport && !kitImport
    ? `import { createSolanaRpc } from "@solana/kit";${eol}${compatReplacement}`
    : compatReplacement;

  edits.push({
    start: compatImport.declaration.getStart(sourceFile),
    end: includeTrailingLineBreak(source, compatImport.declaration.end),
    text: importReplacement,
  });

  writeFileSync(filePath, applyTextEdits(source, edits));

  return {
    path: normalizePath(relative(target, filePath)),
    transform: "connection-string-literals",
    replacements: safeConstructors.length,
    confidence: "high",
    reason: "Only unaliased Connection imports whose usages are single string-literal constructors without member follow-ups are rewritten to createSolanaRpc().",
  };
}

function applyWebsocketConnectionLiteralTransform(target, filePath) {
  const source = readFileSync(filePath, "utf8");
  if (!source.includes("Connection") || !source.includes("@solana/web3-compat")) return null;
  if (!/wss?:\/\//.test(source)) return null;

  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind(filePath));
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const compatImport = findNamedImport(sourceFile, "@solana/web3-compat", "Connection");
  if (!compatImport || compatImport.isTypeOnly || compatImport.isAliased) return null;

  const safeConstructors = [];
  const unsafeConnectionUses = [];

  visit(sourceFile, (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Connection") {
      const args = node.arguments ?? [];
      if (args.length === 1 && isStringLikeLiteral(args[0]) && isWebsocketUrlLiteral(args[0], sourceFile)) {
        safeConstructors.push(node);
      } else if (args.length === 1 && isStringLikeLiteral(args[0])) {
        unsafeConnectionUses.push(node.expression);
      } else {
        unsafeConnectionUses.push(node.expression);
      }
      return;
    }

    if (ts.isIdentifier(node) && node.text === "Connection" && !isImportSpecifierName(node, compatImport.specifier)) {
      unsafeConnectionUses.push(node);
    }
  });

  const constructedNames = new Set(safeConstructors.map((node) => constructedVariableName(node)).filter(Boolean));
  visit(sourceFile, (node) => {
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && ts.isIdentifier(node.expression)
      && constructedNames.has(node.expression.text)
    ) {
      unsafeConnectionUses.push(node.expression);
    }
  });

  if (safeConstructors.length === 0 || unsafeConnectionUses.length > safeConstructors.length) return null;

  const FACTORY = "createSolanaRpcSubscriptions";
  const edits = safeConstructors.map((node) => {
    const [argument] = node.arguments ?? [];
    return {
      start: node.getStart(sourceFile),
      end: node.end,
      text: `${FACTORY}(${argument.getText(sourceFile)})`,
    };
  });

  const kitImport = findImportDeclaration(sourceFile, "@solana/kit");
  const hasFactoryImport = Boolean(findNamedImport(sourceFile, "@solana/kit", FACTORY));
  const compatReplacement = removeNamedImportFromDeclaration(sourceFile, source, compatImport.declaration, "Connection", eol);

  if (!hasFactoryImport && kitImport) {
    const kitReplacement = addNamedImportToDeclaration(sourceFile, kitImport, FACTORY);
    if (kitReplacement) {
      edits.push({ start: kitImport.getStart(sourceFile), end: kitImport.end, text: kitReplacement });
    }
  }

  const importReplacement = !hasFactoryImport && !kitImport
    ? `import { ${FACTORY} } from "@solana/kit";${eol}${compatReplacement}`
    : compatReplacement;

  edits.push({
    start: compatImport.declaration.getStart(sourceFile),
    end: includeTrailingLineBreak(source, compatImport.declaration.end),
    text: importReplacement,
  });

  writeFileSync(filePath, applyTextEdits(source, edits));

  return {
    path: normalizePath(relative(target, filePath)),
    transform: "websocket-connection-literals",
    replacements: safeConstructors.length,
    confidence: "high",
    reason:
      "Only unaliased Connection imports targeting a single websocket URL literal (ws:// or wss://) without other Connection usages are rewritten to createSolanaRpcSubscriptions().",
  };
}

function isWebsocketUrlLiteral(node, sourceFile) {
  const text = node.getText(sourceFile);
  return /wss:\/\//.test(text) || /ws:\/\//.test(text);
}

function scriptKind(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function findNamedImport(sourceFile, packageName, importedName) {
  const declaration = findImportDeclaration(sourceFile, packageName);
  if (!declaration?.importClause?.namedBindings || !ts.isNamedImports(declaration.importClause.namedBindings)) {
    return null;
  }

  for (const specifier of declaration.importClause.namedBindings.elements) {
    if ((specifier.propertyName?.text ?? specifier.name.text) === importedName) {
      return {
        declaration,
        specifier,
        isTypeOnly: Boolean(declaration.importClause.isTypeOnly || specifier.isTypeOnly),
        isAliased: Boolean(specifier.propertyName),
      };
    }
  }

  return null;
}

function findImportDeclaration(sourceFile, packageName) {
  return sourceFile.statements.find((statement) =>
    ts.isImportDeclaration(statement)
    && ts.isStringLiteral(statement.moduleSpecifier)
    && statement.moduleSpecifier.text === packageName,
  );
}

function removeNamedImportFromDeclaration(sourceFile, source, declaration, importedName, eol) {
  const importClause = declaration.importClause;
  const namedBindings = importClause?.namedBindings;
  if (!importClause || !namedBindings || !ts.isNamedImports(namedBindings)) return declaration.getText(sourceFile);

  const remaining = namedBindings.elements
    .filter((specifier) => (specifier.propertyName?.text ?? specifier.name.text) !== importedName)
    .map((specifier) => specifier.getText(sourceFile));

  if (remaining.length === 0) return "";

  const quote = source[declaration.moduleSpecifier.getStart(sourceFile)] === "'" ? "'" : '"';
  return `import { ${remaining.join(", ")} } from ${quote}${declaration.moduleSpecifier.text}${quote};${eol}`;
}

function addNamedImportToDeclaration(sourceFile, declaration, importedName) {
  const importClause = declaration.importClause;
  const namedBindings = importClause?.namedBindings;
  if (!importClause || !namedBindings || !ts.isNamedImports(namedBindings)) return null;
  if (namedBindings.elements.some((specifier) => (specifier.propertyName?.text ?? specifier.name.text) === importedName)) {
    return null;
  }

  const imports = [...namedBindings.elements.map((specifier) => specifier.getText(sourceFile)), importedName];
  const quote = declaration.getText(sourceFile).includes("'@solana/kit'") ? "'" : '"';
  return `import { ${imports.join(", ")} } from ${quote}${declaration.moduleSpecifier.text}${quote};`;
}

function isStringLikeLiteral(node) {
  return Boolean(node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)));
}

function constructedVariableName(node) {
  if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    return node.parent.name.text;
  }
  return null;
}

function isImportSpecifierName(node, specifier) {
  return node.getStart() === specifier.name.getStart() && node.end === specifier.name.end;
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function includeTrailingLineBreak(source, end) {
  if (source.slice(end, end + 2) === "\r\n") return end + 2;
  if (source[end] === "\n") return end + 1;
  return end;
}

function applyTextEdits(source, edits) {
  return edits
    .sort((left, right) => right.start - left.start || right.end - left.end)
    .reduce((text, edit) => `${text.slice(0, edit.start)}${edit.text}${text.slice(edit.end)}`, source);
}
