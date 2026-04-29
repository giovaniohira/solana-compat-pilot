export function parseArgs(argv) {
  const options = { apply: false, install: false, checks: [], directKit: [], excludeGlobs: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target" || arg === "-t") options.target = argv[++index];
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--install") options.install = true;
    else if (arg === "--allow-dirty") options.allowDirty = true;
    else if (arg === "--skip-validation") options.skipValidation = true;
    else if (arg === "--include-test-dirs") options.includeTestDirs = true;
    else if (arg === "--direct-kit") options.directKit.push(argv[++index]);
    else if (arg === "--exclude-glob") options.excludeGlobs.push(argv[++index]);
    else if (arg === "--report") options.report = argv[++index];
    else if (arg === "--patch") options.patch = argv[++index];
    else if (arg === "--check") options.checks.push(argv[++index]);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function printHelp() {
  console.log(`Usage:
  node scripts/migration-pipeline.mjs --target <repo> [--dry-run]
  node scripts/migration-pipeline.mjs --target <repo> --apply [--install] [--skip-validation] [--direct-kit public-key-literals] [--check "npm test"]

Options:
  --target, -t   Target repository path
  --dry-run      Analyze and write a report without modifying files (default)
  --apply        Apply manifest edits and run the Codemod workflow
  --install      Run the detected package manager install command after manifest edits
  --allow-dirty  Allow apply mode on a dirty git target (refused by default)
  --skip-validation  Allow apply without any --check commands (unsafe; default is to require checks)
  --include-test-dirs  Include tests/, __tests__/, fixtures/, etc. in scan counts (default excludes them)
  --exclude-glob Add a path glob (POSIX, relative to target) excluded from scans; repeatable
  --direct-kit   Opt into a proven direct Kit transform; values: public-key-literals, connection-string-literals, websocket-connection-literals
  --check        Validation command to run after apply; repeatable (required for --apply unless --skip-validation)
  --report       Report output path (default: target/solana-compat-pilot-report.json)
  --patch        Rollback patch output path (default: target/solana-compat-pilot.rollback.patch)
`);
}
