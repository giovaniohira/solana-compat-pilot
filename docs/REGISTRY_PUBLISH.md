# Publish to the Codemod Registry

You (the package owner) must authenticate with Codemod; this cannot be done from a headless agent on your behalf.

## “No packages found” when adding a Trusted Publisher

The Codemod UI only lists packages that **already exist** on the registry. **`solana-compat-pilot` is created on the first successful `codemod publish`**, not before.

**Order:**

1. **Bootstrap publish once** (creates the package) — use GitHub Actions on Linux so bundling works and there is no fat local `node_modules`:
   - Create an API key at [go.codemod.com/api-keys](https://go.codemod.com/api-keys) (publish permission).
   - Add it as a repository secret **`CODEMOD_API_KEY`** (GitHub repo → Settings → Secrets and variables → Actions), or:  
     `gh secret set CODEMOD_API_KEY --repo giovaniohira/solana-compat-pilot` *(paste the key when prompted)*.
   - Run: **`gh workflow run "Publish Codemod (bootstrap - API key once)" --ref master`**  
     Or use **Actions** → that workflow → **Run workflow**.
2. **Then** open **Add Trusted Publisher** again — **`solana-compat-pilot`** should appear in the package list.
3. Set **Repository owner** to `giovaniohira`, **Repository name** to `solana-compat-pilot`.
4. Set **Workflow path** to **`.github/workflows/publish-codemod.yml`** (not `publish.yml`; that is only an example in Codemod’s docs).
5. After Trusted Publisher is saved, use OIDC: **`gh workflow run "Publish Codemod" --ref master`** (or push a `v*` tag). You can remove **`CODEMOD_API_KEY`** from repo secrets once OIDC publishes succeed.

## I don’t want to use Linux on my PC

You don’t have to install WSL or open Ubuntu locally.

- **Recommended:** Stay on Windows and run publish **from your terminal with GitHub CLI** — the heavy step runs on **GitHub’s cloud runner** (`ubuntu-latest`), not on your machine:

  ```bash
  gh workflow run "Publish Codemod (bootstrap - API key once)" --ref master   # first time, if package missing
  gh workflow run "Publish Codemod" --ref master                               # after Trusted Publisher
  gh run watch --repo giovaniohira/solana-compat-pilot
  ```

  That is still “you publishing from Windows”; only the CPU that bundles the package is in the cloud.

## Why a fully local `codemod publish` on Windows usually fails today

1. **Size:** With this repo’s normal `npm ci`, `node_modules` pushes the publish tarball over the **50 MB** registry cap (~**150 MB**, mostly the `codemod` CLI optional binaries). `.codemodignore` does not fix that in current CLI behavior here.
2. **Bundling:** A **minimal** `node_modules` (only `@codemod.com/jssg-types` + `typescript`, ~24 MB total) avoids the size limit, but the Windows CLI then hits **Rolldown `UnresolvedEntry`** on the JSSG entry file even though it exists — a **Windows + bundler** limitation in the Codemod CLI today, not your repo layout.
3. So **100% local Windows-only publish** is not reliable until Codemod fixes that path; use **`gh workflow run`** (above) or another machine/OS for `codemod publish`.

The JSSG entrypoint lives at the repo root as **`solana-compat-pilot.codemod.ts`** (workflow `js_file: ./solana-compat-pilot.codemod.ts`) so published packages match common registry layouts.

## Option A — GitHub Actions (recommended)

Uses OIDC after the package exists (see **“No packages found”** above for the one-time bootstrap).

1. Sign in at [app.codemod.com](https://app.codemod.com) with GitHub.
2. Open [API Keys → Trusted Publishers](https://go.codemod.com/api-keys) and **Add Trusted Publisher** for package **`solana-compat-pilot`** (must match `name` in `codemod.yaml`), pointing at this GitHub repo (`owner` + `name`). Restrict **Workflow path** to **`.github/workflows/publish-codemod.yml`** if you use that field.
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
