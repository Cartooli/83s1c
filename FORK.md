# FORK.md — 83s1c

83s1c is a modified version of World Monitor (https://github.com/koala73/worldmonitor),
licensed AGPL-3.0-only. This file is the AGPL §5(a) record of what changed and when.

## Upstream

| Field | Value |
|---|---|
| Upstream repo | https://github.com/koala73/worldmonitor |
| Forked from SHA | `4e83ff7ef1ae029d29393b9f0d1c5b29650ad9b1` (2026-10-19) |
| Last synced SHA | `4e83ff7ef1ae029d29393b9f0d1c5b29650ad9b1` |

## Change log

Dates are UTC. Every edit to an upstream-owned file is listed here.

### 2026-10-19 — M0: fork with history

- Merged upstream `main` at `4e83ff7` with `--allow-unrelated-histories` (full history kept).
- Deleted the placeholder file `rsrr`.
- Added `FORK.md`, `CLAUDE.md`, and `docs/fork/` (the build packet: SPEC, SECURITY-AND-LICENSE,
  ENV-AND-INFRA, 00-RUN-THIS-PROMPT).
- Upstream file edited: `.gitignore` — `CLAUDE.md` is ignored upstream; scoped the rule to allow
  the fork's root `CLAUDE.md`.

### 2026-10-19 — M1: neutralize upstream infra

Removed (deleted from the tree):

- Workflows: all except `codeql`, `security-audit`, `typecheck`, `lint-code`, `test`,
  `proto-check`. Added fork-owned `gitleaks.yml`.
- Desktop app: `src-tauri/`, `desktop-sign-in.html`, desktop build/package scripts.
- Clients: `cli/`, `sdk/`, `plugin.*`, `vite.plugin.config.ts`, `mcp-grant.html`,
  `server.json`, `mcp.json`.
- Infra: all `Dockerfile*`, `docker/` (except the test shim below), `deploy/`, `workers/`,
  `consumer-prices-core/`, `nixpacks.toml`, `docker-compose.yml`, Railway control-plane,
  Umami-ops and Telegram scripts.

Disabled (source kept, never built, deployed, or run):

- `pro-test/`, `blog-site/`: the finance prebuild (`product:facts`) reads and writes them;
  `build:pro`/`build:blog` are removed and no route serves them.
- `scripts/ais-relay.cjs`, `scripts/notification-relay.cjs`: ~100 test suites cover shared
  logic inside them; nothing runs them (no Railway, no Dockerfile).
- `scripts/railway-services.json`, `docker/redis-rest-proxy.mjs`: test fixtures.
- Convex, Clerk, Dodo, Sentry, Resend, Telegram code paths: inert with their env vars unset;
  `ENV-AND-INFRA` §4 forbids setting them. `src/` imports Convex generated types, so removing
  it is a refactor, not a strip.

Upstream files edited:

- `.github/workflows/{test,typecheck,security-audit,codeql}.yml`: jobs/steps for removed
  surfaces dropped (desktop, docs-stats, umami, consumer-prices, pro, blog, digest/relay
  images, rust audit, go/ruby/rust CodeQL).
- `.github/dependabot.yml`: only root + `scripts/` npm and actions.
- `.github/CODEOWNERS`: `@koala73` → `@Cartooli`.
- `ARCHITECTURE.md`: CI table matches the kept workflows.
- `docs/.mintignore`: excludes `docs/fork/`.
- `package.json` / `package-lock.json`: removed scripts for deleted surfaces;
  `@tauri-apps/cli` dropped.
- `vite.config.ts`: `desktopSignIn` and `mcpGrant` inputs removed.
- `scripts/run-data-tests.mjs`: filters `scripts/fork/skipped-tests.json`.
- `tests/data-test-shards.test.mjs`: inventory honours the fork skip list; CLI glob removed.
- `scripts/enforce-safe-local-storage.mjs`: inventory line for deleted `mcp-grant-main.ts`.
- `shared/source-attribution-manifest.json` + generated product facts: regenerated.
- `src/main.ts`: `initAnalytics()` (Umami at abacus.worldmonitor.app) no longer called.
- `src/styles/base-layer.css`: imports fork-owned `src/config/fork/fork.css`, which hides
  the Clerk sign-in widget, Pro banner and locked-panel upgrade CTA.

- `.github/workflows/gitleaks.yml` (fork-owned): `pull-requests: read` so PR scans can list commits.
- `.github/workflows/codeql.yml`: analyze job gains `actions: read` (private-repo token defaults omit it).
- `.github/workflows/lint-code.yml`: TUI catalog and desktop version-sync checks removed.
- `.github/workflows/test.yml`: Pro bundle budget check removed (Pro site not built).
- `tsconfig.dom-tests.json`, `vitest.dom.config.mts`: exclude `country-headline-severity` DOM test
  (imports the removed plugin-country entry point).
- `package.json`: `sync:tui-catalog*` scripts and the `mcp-market-built` e2e spec (plugin build)
  removed from the ci-smoke lists; `e2e/mcp-market-built.spec.ts` and `scripts/sync-tui-catalog.mjs`
  deleted.
- `.gitleaksignore` (fork-owned): exact fingerprints of triaged upstream-history findings.

Skipped tests: `scripts/fork/skipped-tests.json` lists every suite skipped because its
subject was removed, with the reason. Never add a suite there to hide a regression.

## Merge procedure

See `docs/fork/ENV-AND-INFRA.md` §8. In short:

```bash
git fetch upstream
git checkout -b sync/$(date +%Y-%m)
git merge upstream/main
```

Keep fork-owned paths (`src/config/fork/`, `scripts/fork/`, `api/fork/`, `docs/fork/`) on
conflict, re-check every upstream file listed above, re-run the SECURITY-AND-LICENSE §4 gates,
update "Last synced SHA", and open a PR.
