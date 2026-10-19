# 83s1c security evidence (SECURITY-AND-LICENSE §4)

Recorded 2026-10-19 on branch `fork/m3-security`, locally on macOS with Node 22. CI runs the
same suites on Node 24. Preview checks (M4) are in the last section.

| # | Gate | Status |
|---|---|---|
| 1 | Fail-closed secrets | Pass (test) |
| 2 | MCP 401 without `WORLDMONITOR_VALID_KEYS` | Pass (test and preview) |
| 3 | No client secrets | Pass for values; names appear as labels (see below) |
| 4 | Gitleaks, full history | Pass with triaged upstream-history ignore list |
| 5 | `npm audit --omit=dev` | Pass: 0 high, 0 critical |
| 6 | Security headers | Pass (preview) |
| 7 | Rate limiting | Blocked: needs Upstash (not provisioned) |
| 8 | Environment isolation | Partial: separate secrets and protection done; separate DBs need Upstash |
| 9 | SSRF in rss-proxy | Pass (test) |
| 10 | CORS via curl | Pass (preview) |
| 11 | No worldmonitor.app at runtime | Pass at runtime; residual strings in JS listed below |
| 12 | SECURITY.md | Pass |
| 13 | Branch protection on `main` | Applied |

## 1, 2, 9. Fail-closed, MCP, SSRF

`tests/fork-fail-closed.test.mts` imports the real handlers only after deleting every secret-like
and vendor env var. It blocks all outbound fetches and records them.

- Removed surfaces (`src/config/fork/removed-routes.ts`: billing, accounts, hosted-MCP OAuth,
  Pro notifications/briefs/widgets, upstream ops) answer 404 in `middleware.ts` before their
  handlers run. The probe that motivated this found handlers degrading open with secrets unset:
  - `customer-portal` answered 302 to `www.worldmonitor.app`;
  - the Slack/Discord OAuth callbacks answered 200;
  - `product-catalog` served upstream's Pro pricing.
- The remaining secret-reading routes are listed in `scripts/fork/secret-routes.txt` and must
  answer >= 400.
- There are no `/api/local-*` admin routes: those were the desktop sidecar's, removed in M1.

```text
$ node --import tsx --test tests/fork-fail-closed.test.mts
  ✔ POST /api/mcp tools/call without WORLDMONITOR_VALID_KEYS returns 401
✔ fail-closed: MCP (gate 2)
  ✔ a premium market RPC without credentials is refused
✔ fail-closed: premium RPC
  ✔ every removed prefix answers 404 before its handler
  ✔ does not block the routes the dashboard needs
✔ fail-closed: removed surfaces are unreachable (middleware)
  ✔ lists the routes it checks
  ✔ api/opensky.js refuses without secrets
  ✔ api/symbol-search.ts refuses without secrets
✔ fail-closed: every remaining secret-reading route (gate 1)
  ✔ refuses an unauthenticated caller before any fetch
  ✔ refuses http://169.254.169.254/latest/meta-data/
  ✔ refuses http://localhost/
  ✔ refuses http://127.0.0.1:8080/
  ✔ refuses https://evil.example.com/feed.xml
  ✔ control: an allow-listed feed host is attempted, so the refusals above are the allowlist
✔ SSRF: rss-proxy only fetches allow-listed feed hosts (gate 9)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

The SSRF control case shows that the refusals come from the allowlist: an allow-listed host *is*
fetched for the same authenticated caller, while 169.254.169.254, localhost, 127.0.0.1 and an
unlisted host are refused before any fetch.

## 3. No client secrets

```text
$ npm run security:vite-env-secrets -- --strict-local   # exit 0
$ npm run security:local-env-dumps                       # exit 0
```

`dist/` from `npm run build:finance`, built with no secrets in the environment:

- **Value patterns: 0 hits.** Patterns checked: AWS `AKIA…`, `sk-ant/or/proj-…`, `ghp_…`,
  Slack `xox?-…`, PEM private keys, Google `AIza…`, Stripe `sk_live_…`.
- **Secret names: 24 of the 95 server secret names in `.env.example` appear.** All are labels,
  not values:
  - the bundled desktop settings registry (`runtime-config`) lists the keys a desktop user can
    enter;
  - upstream locale help strings name env vars (for example `FINNHUB_API_KEY`).

  Removing them would mean refactoring upstream's settings module. This is recorded rather than
  claimed as 0 hits.

## 4. Secret scan

```text
$ gitleaks git --log-opts="fork/m1-neutralize" --redact .
7998 commits scanned ... leaks found: 258        # before triage
$ gitleaks git --log-opts="main..fork/m1-neutralize" --redact .   # with .gitleaksignore
no leaks found
$ gitleaks git --log-opts="fork/m1-neutralize..HEAD" --redact .
no leaks found
```

Triage of the 258 historical findings, all in upstream koala73/worldmonitor history (two are in
fork commits that restored upstream files):

- 246 `generic-api-key` and 11 `curl-auth-header`: test fixtures, docs placeholders, product
  IDs, and public Clerk publishable keys in old built assets.
- 1 `cloudflare-api-key`: a Cloudflare Radar token that the upstream maintainer hardcoded in
  `src/services/outages.ts` (commit 0db94ee8, 2026-01-09). It is in upstream's public history,
  has never been in this fork's tree at any HEAD, and is not ours to rotate.

`.gitleaksignore` pins the exact `commit:file:rule:line` fingerprints, so every new commit is
still scanned in full. `pro-test/.env.production` (upstream's Clerk publishable key) was
removed from the tree.

## 5. Dependencies

```text
$ npm audit --omit=dev --json | jq .metadata.vulnerabilities
{"info":0,"low":0,"moderate":20,"high":0,"critical":0,"total":20}
```

## 11. No worldmonitor.app at runtime

- **Runtime (M2 preview, `npm run preview`):** `performance.getEntriesByType('resource')` hosts
  were `["localhost:4173"]`, so there were no upstream requests.
- **`dist/` static files:** upstream SEO/docs/agent files are pruned at build
  (`PRUNED_PUBLIC_PATHS` in `src/config/fork/vite-brand-plugin.ts`). Links outside scripts are
  rebranded. Two files remain, both logic rather than requests:
  - `push-handler.js`: the service worker's first-party host allowlist;
  - `wm-widget-sandbox.html`: a CSP-hashed inline origin check.
- **`dist/assets` (51 JS chunks):** these contain upstream URL strings in code paths the
  dashboard does not run on 83s1c.online:
  - Pro/upgrade links, whose CTAs are hidden;
  - the variant switcher, which is hidden;
  - the desktop updater (desktop only);
  - the Umami loader, never called;
  - country-brief "host" mode (embedded MCP apps only);
  - docs links.

  The runtime network check above is the authoritative proof.

## 12. SECURITY.md

Reports now go to this repository's GitHub private vulnerability reporting and @Cartooli, with a
note to also report upstream-affecting issues to koala73/worldmonitor.

## 13. Branch protection

```text
$ gh api -X PUT repos/Cartooli/83s1c/branches/main/protection --input bp.json
{"checks":["typecheck","biome","markdown","scan","security-audit","sidecar","dom-tests","unit","variant-smoke-full"],"pr":true,"force":false,"del":false,"admins":false}
```

- Pull requests are required (0 approvals, single maintainer), and force-push and deletion are
  off.
- CodeQL is not yet required, because private repositories without Advanced Security cannot run
  code scanning ("Code scanning is not enabled for this repository"). Add the three
  `Analyze (...)` checks once the repository is public (M5).
- Admin enforcement is off so the bootstrap PR (#1) can merge despite two checks that can only
  fail on it: `proto-changes` (GitHub lists only 3,000 of its 8,078 files) and the
  `unit-built-output` health-probe cutover (it diffs against the old `main`, which has no
  `api/`).

## Preview checks (M4)

Preview deployment `https://83s1c-k3bg3k5m5-dwellchecker.vercel.app`. It is behind Vercel Authentication, so requests go through
`vercel curl`. The upstream bot gate 403s curl's user agent on `/api/*`, so API calls send a
browser user agent.

```text
GET /dashboard -> HTTP/2 200
  content-security-policy: ... frame-ancestors 'none' ...
  strict-transport-security: max-age=63072000; includeSubDomains
  x-content-type-options: nosniff
  referrer-policy: strict-origin-when-cross-origin
  x-frame-options: SAMEORIGIN

GET /api/health?compact=1 (Origin: https://83s1c.online)          -> 503, access-control-allow-origin: https://83s1c.online
GET /api/health?compact=1 (Origin: https://83s1c.online.evil.com) -> 403, no access-control-allow-origin
GET /api/health?compact=1 (Origin: https://x.vercel.app)          -> 403, no access-control-allow-origin

POST /api/mcp tools/call, no key, browser UA -> 401
POST /api/mcp, curl UA                       -> 403 (upstream bot gate, before MCP)
GET /api/customer-portal (removed surface)   -> 404
GET /source -> 302 Location: https://github.com/Cartooli/83s1c/tree/<deployed SHA>
GET /api/health (detailed, no key)           -> 401 "Detailed health requires an operator/enterprise API key"
```

- **Gate 6 (headers):** pass.
- **Gate 10 (CORS):** pass. The allowed origin is echoed; look-alikes get 403 and no allow
  header.
- **Gate 7 (rate limit):** blocked. Upstream's limiter needs Upstash, which is not provisioned
  (see the M4 PR).
- **Gate 8 (isolation):**
  - `WM_SESSION_SECRET` differs between Preview and Production; each was generated separately
    and stored as a sensitive variable.
  - Vercel Authentication covers all deployments until M5.
  - No market-data or vendor secrets are set anywhere.
  - Separate Upstash databases per environment are pending provisioning.
- **Health:** `/api/health?compact=1` answers 503 `REDIS_DOWN` without Redis, which is the
  correct fail-closed behavior. It turns OK once Upstash is connected.

## Regenerating

- `scripts/fork/secret-routes.txt`: list `api/` files whose source reads
  `process.env.*(SECRET|KEY|TOKEN|PASSWORD|KEYS)`, then drop helper modules, `api/health.js`
  and anything matched by `removed-routes.ts`.
- Re-run every block above after each upstream merge.
