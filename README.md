# Dashboard Vaccine Mayo

This repository contains the source code and documentation that are intended to be committed to GitHub and deployed.

## What Is Committed To GitHub

Use this command to see the exact files that belong to GitHub:

```bash
git ls-files
```

Main committed areas:

- `frontend/` - React/Vite dashboard deployed to Cloudflare.
- `src/` - Google Apps Script TypeScript source.
- `tests/` - automated tests for domain and frontend view-model behavior.
- `docs/` - decisions, runbooks, plans, and implementation notes.
- `scripts/` and `tools/` - build and operational helper scripts.
- Root project files such as `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `PRODUCT.md`, `DESIGN.md`, and `CONTEXT.md`.

## What Is Local Only

Local-only working files go in `_local/`.

`_local/` is ignored by Git, so it can contain design references, mock data, export files, generated experiments, tool state, or private working notes without being pushed to GitHub.

Current local-only structure:

- `_local/design-references/` - HTML mockups or design references.
- `_local/mock-data/` - sample JSON or temporary mock data.
- `_local/data-templates/` - import templates or spreadsheet exports used during local work.
- `_local/tool-state/` - tool-specific local state such as Claude/Codex helper files.

## Safe Two-Laptop Workflow

When switching laptops:

1. Open this folder.
2. Run `git status --short --branch`.
3. If it says `main...origin/main`, the committed code matches GitHub.
4. Files under `_local/` may sync through Google Drive, but they are not part of GitHub.
5. Before editing code, run `git pull origin main`.
6. After editing code, run tests/build before commit:

```bash
npm test
cd frontend
npm run build
```

## How To Tell What Will Be Pushed

Before committing, check:

```bash
git status --short
git diff --stat
```

Only files shown as staged by this command will be included in the next commit:

```bash
git diff --cached --stat
```

Do not use `git add -A` when local working files are mixed with code changes. Stage specific files instead.

## Service Unit GAS Setup

See `docs/runbooks/service-unit-gas-setup.md` for the steps to install the generated `Code.gs` script in each service-unit Google Sheet.
