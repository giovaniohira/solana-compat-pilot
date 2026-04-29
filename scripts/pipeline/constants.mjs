export const LEGACY_PACKAGE = "@solana/web3.js";
export const REQUIRED_PACKAGES = {
  "@solana/web3-compat": "^0.0.21",
  "@solana/kit": "^6.8.0",
  "@solana/client": "^1.7.0",
};
export const DEFAULT_REPORT_PATH = "solana-compat-pilot-report.json";
export const DEFAULT_PATCH_PATH = "solana-compat-pilot.rollback.patch";
export const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
export const IGNORE_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage"]);
export const DIRECT_KIT_TRANSFORMS = new Set(["public-key-literals", "connection-string-literals"]);

/** Paths relative to target (POSIX) excluded from scan/report counts by default. */
export const DEFAULT_REPORT_PATH_EXCLUSIONS = [
  /(^|\/)(tests|__tests__|fixtures|__mocks__|e2e|\.cursor)(\/|$)/,
  /\.(test|spec)\.(mjs|cjs|ts|tsx|js|jsx)$/,
];
