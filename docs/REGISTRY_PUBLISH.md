# Publish to the Codemod Registry

You (the package owner) must authenticate with Codemod; this cannot be done from a headless agent on your behalf.

## Why `npx codemod publish` failed locally (Windows)

1. **Size:** With `node_modules` present, the CLI tarball can exceed the **50 MB** registry limit (~150 MB+ from `npm ci` in this repo). A `.codemodignore` file is committed to exclude heavy paths when the CLI honors it; if you still see “Package too large”, publish from **GitHub Actions** (clean checkout, no `node_modules`) or temporarily move `node_modules` aside and use a **globally** installed CLI (see below).
2. **Bundling:** With `node_modules` removed, `npx` may recreate local installs during the command. Prefer **`codemod publish`** after `npm install -g codemod@1.9.0` so the project tree stays small.
3. **Windows:** If you see `Rolldown bundling failed: UnresolvedEntry` for `scripts/solana-compat-pilot.ts`, try the same publish on **Linux** (WSL2 or CI); the official `codemod/publish-action` runs on `ubuntu-latest`.

## Option A — GitHub Actions (recommended)

Uses OIDC; no long-lived API key in the repo.

1. Sign in at [app.codemod.com](https://app.codemod.com) with GitHub.
2. Open [API Keys → Trusted Publishers](https://go.codemod.com/api-keys) and **Add Trusted Publisher** for package **`solana-compat-pilot`** (must match `name` in `codemod.yaml`), pointing at this GitHub repo (`owner` + `name`). Match any ref/workflow restrictions you add in the UI to the workflow file below.
3. Trigger [Publish Codemod](../../.github/workflows/publish-codemod.yml) via **Actions → Run workflow**, or push a git tag matching `v*` (e.g. `v0.1.0`).
4. After a green run, install for judges:

   ```bash
   npx codemod solana-compat-pilot
   ```

   Scoped packages use `npx codemod @scope/name` — if you later rename in `codemod.yaml`, follow the registry UI for the exact install string.

## Option B — Local login

```bash
npx codemod login
npx codemod whoami
# If "Package too large": use global CLI so npx does not repopulate node_modules
npm install -g codemod@1.9.0
# temporarily: move node_modules out of the repo, then:
codemod publish .
```

API key flow (CI without OIDC): [Publishing — API Keys](https://docs.codemod.com/publishing#api-keys).

## After publish

- Put the exact `npx codemod …` line in [`README.md`](../README.md) and your DoraHacks BUIDL ([`HACKATHON_WIN_PLAN.md`](HACKATHON_WIN_PLAN.md)).
- Bump `version` in `codemod.yaml` for each new registry release.
