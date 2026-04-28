import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const LEGACY_PACKAGE = "@solana/web3.js";
const COMPAT_PACKAGE = "@solana/web3-compat";
const MARKER = "SOLANA_COMPAT_PILOT";

const HOTSPOTS = [
  { token: "new Connection", reason: "Connection can often become createSolanaRpc, but method coverage must be checked." },
  { token: "new PublicKey", reason: "PublicKey can sometimes become address(), but object-method call sites may still need compat." },
  { token: "Keypair.", reason: "Keypair to Kit signer migration may require async control-flow changes." },
  { token: "Transaction", reason: "Mutable transactions need a transaction-message pipeline review before Kit migration." },
  { token: "onAccountChange", reason: "Subscriptions should be reviewed against createSolanaRpcSubscriptions." },
  { token: "sendAndConfirmTransaction", reason: "Submission flow may need Kit signing and send pipeline changes." },
];

const codemod: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const source = rootNode.text();
  const eol = source.includes("\r\n") ? "\r\n" : "\n";

  const packageLiterals = rootNode.findAll({
    rule: {
      kind: "string",
      regex: quoteRegex(LEGACY_PACKAGE),
    },
  }).filter(isPackageImportSource);

  if (packageLiterals.length === 0) {
    return null;
  }

  const edits: Edit[] = packageLiterals.map((literal) =>
    literal.replace(replacePackageLiteral(literal.text())),
  );

  if (!source.includes(MARKER)) {
    const triggered = HOTSPOTS.filter((hotspot) => source.includes(hotspot.token));

    if (triggered.length > 0) {
      edits.push({
        startPos: 0,
        endPos: 0,
        insertedText: buildReviewMarker(triggered, eol),
      });
    }
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

function quoteRegex(value: string): string {
  return `["']${escapeRegex(value)}["']`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replacePackageLiteral(literal: string): string {
  const quote = literal.startsWith("'") ? "'" : '"';
  return `${quote}${COMPAT_PACKAGE}${quote}`;
}

function isPackageImportSource(literal: SgNode<TSX>): boolean {
  return literal.ancestors().some((ancestor) => {
    if (ancestor.kind() === "import_statement") {
      return true;
    }

    if (ancestor.kind() !== "call_expression") {
      return false;
    }

    return /^require\s*\(/.test(ancestor.text());
  });
}

function buildReviewMarker(triggered: Array<{ token: string; reason: string }>, eol: string): string {
  const lines = [
    `// ${MARKER}: safe import bridge applied. Review these full-Kit migration hotspots before removing this marker:`,
    ...triggered.map((hotspot) => `// - ${hotspot.token}: ${hotspot.reason}`),
    "",
  ];

  return `${lines.join(eol)}${eol}`;
}

export default codemod;
