# Publish to the Codemod Registry

You (the package owner) must authenticate with Codemod; this cannot be done from a headless agent on your behalf.

## Why `npx codemod publish` often fails on Windows

1. **Size:** With `node_modules` present, the publish tarball exceeds the **50 MB** registry limit (~**150 MB** from this repo’s `npm ci`, driven mainly by the `codemod` CLI optional native binaries). `.codemodignore` does **not** shrink that bundle in current CLI behavior here.
2. **Bundling without `node_modules`:** If you strip `node_modules` and run `codemod publish`, Rolldown may fail with **`UnresolvedEntry`** for the JSSG entry file on **Windows**, even when the `.ts` file exists on disk. The same tree publishes successfully from **Linux** (e.g. GitHub Actions `ubuntu-latest`).
3. **Practical fix:** Use the **[Publish Codemod](../../.github/workflows/publish-codemod.yml)** workflow after configuring a **Trusted Publisher** (below). No local `node_modules` and no Windows bundler path.

The JSSG entrypoint lives at the repo root as **`solana-compat-pilot.codemod.ts`** (workflow `js_file: ./solana-compat-pilot.codemod.ts`) so published packages match common registry layouts.

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
