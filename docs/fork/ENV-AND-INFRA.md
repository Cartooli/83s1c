# 83s1c — Env vars, infrastructure, deploy

Tags: [V] means verified 2026-10-19; [I] means inferred; [A] means assumed.

## 1. Current state [V]

- **Repo:** `Cartooli/83s1c` is private, default branch `main`, and has one commit (the
  placeholder file `rsrr`).
- **Vercel team `dwellchecker`** (`team_Lup2S4TMzoobQyxDrAis44xL`): no project matching
  "83s1c", and the domain is not added to the team.
- **DNS for 83s1c.online:** nameservers are GoDaddy (`ns29/ns30.domaincontrol.com`), and the
  A records `3.33.130.190` and `15.197.148.33` are parking IPs. Vercel reports it as
  misconfigured.

## 2. Vercel project

- **Name:** `83s1c`, in team `dwellchecker`, connected to Git repo `Cartooli/83s1c`.
- **Framework:** Other/Vite.
- **Build:** `npm run build:finance` [V script exists]. Don't use upstream's `build:full`:
  it builds the Pro bundle, blog, and plugin we strip.
- **Output:** `dist`. Confirm this against `vite.config.ts` [I].
- **Node.js:** 24, to match `.nvmrc` [V].
- **Deployment Protection:** Vercel Authentication on Preview. On Production, keep it on
  until M5's public-source decision, then turn it off.
- **Ignored build step:** remove upstream's `scripts/vercel-ignore.sh` reference unless
  reviewed [V referenced in vercel.json].

## 3. Upstash Redis

Provision it via the Vercel Marketplace integration in `dwellchecker`, as two databases:
`83s1c-prod` and `83s1c-preview`. Each injects `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` [V names] into its own environment only.

## 4. Environment variables

| Var | Env | Required | Notes |
|---|---|---|---|
| `VITE_VARIANT` | all | yes | `finance` (needs the variant.ts patch from SPEC §5) [V] |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | prod / preview, separate | yes | Cache, rate limits, seeded data |
| `WM_SESSION_SECRET` | prod / preview, separate | yes [V: `api/_session.js` throws if unset or under 32 chars] | `openssl rand -hex 32` |
| `FINNHUB_API_KEY` | server + Actions | recommended | Market quotes, earnings calendar, economy [V seeders read it] |
| `ALPHA_VANTAGE_API_KEY` | server + Actions | recommended | Quotes fallback, commodities, ETF flows [V] |
| `FRED_API_KEY` | Actions | recommended | Economic calendar, macro [V] |
| `EIA_API_KEY` | Actions | optional | Energy and economy panel [V] |
| `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` | server | optional | AI news briefs. Set a provider-side spend cap |
| `WORLDMONITOR_VALID_KEYS` | server | **leave unset** | Unset means MCP returns 401 (the security gate) |
| `SEC_USER_AGENT` (M6) | Actions | M6 | e.g. `83s1c rob@cartooli.com` (SEC fair access) [A] |
| `VITE_PRIVATE_MARKETS` (M6) | all | M6 | `1` to show the panel |
| `VITE_MARKET_QUOTES` | prod `0`, desk `1` | yes | Gates the Finnhub, Alpha Vantage, and Yahoo panels; the public site never shows them |

`FINNHUB_API_KEY` and `ALPHA_VANTAGE_API_KEY` are set **only** in the desk project and the
desk seeder environment, never in public Production.

**Never set:**

- any `VITE_*` var holding a secret;
- `CLERK_*`, `DODO_*`, `CONVEX_*`, `TELEGRAM_*`, `RESEND_*`, `VITE_SENTRY_DSN`;
- `I_UNDERSTAND_THIS_DISABLES_AUTH=true` (upstream's auth kill switch) [V].

Some seeders read keys through shared helpers. The list above is the minimum known [I]. Run
each seeder once locally against the Preview DB and add any key its error names.

## 5. Seeders on GitHub Actions (replaces upstream's Railway fleet)

Workflow `.github/workflows/fork-seed.yml`:

- runs on `schedule` plus `workflow_dispatch`;
- uses Node 24, `npm ci`, then runs the listed scripts sequentially with
  `continue-on-error` per script;
- ends with a summary step that fails the run if more than 30% of the seeders failed.

Use separate jobs for Preview and Production. Each job reads its own Actions *environment*
secrets.

| Cadence | Seeders [V exist in `scripts/`] |
|---|---|
| every 30 min, weekday market hours | `seed-market-quotes`, `seed-commodity-quotes`, `seed-crypto-quotes`, `seed-fx-rates`, `seed-market-breadth` |
| hourly | `seed-prediction-markets`, `seed-live-video-resolved` (YouTube may refuse runner IPs [V upstream note]; if so, live video falls back to the static source list) |
| every 6 h | `seed-economic-calendar`, `seed-earnings-calendar`, `seed-etf-flows`, `seed-fred-rates`, `seed-ecb-fx-rates`, `seed-us-treasury-par-yield`, `seed-bundle-macro`, `seed-economy` |
| daily (M6) | `scripts/fork/seed-sec-form-d.mjs` |

Before scheduling, compute the run budget. 30-minute runs during market hours come to about
150 runs a week; check the Actions minutes on the Cartooli plan [A]. Keep the Yahoo-only
symbol set disabled on public deploys (see SPEC §9).

## 6. Domain cutover (M5; requires Rob's explicit yes)

1. In Vercel, add `83s1c.online` and `www.83s1c.online` to project `83s1c`. Make the apex
   primary and redirect www to the apex.
2. In GoDaddy DNS, replace the parking A records:
   - `A  @    76.76.21.21` [V Vercel recommended value]
   - `CNAME  www  cname.vercel-dns.com.` [V]
3. Verify: `dig +short 83s1c.online` returns `76.76.21.21`; the Vercel domain config is no
   longer misconfigured; `curl -sI https://83s1c.online` returns 200 with HSTS; and the
   footer Source link points to the public repo at the deployed SHA.

## 7. Push and verify (if Claude Code can't push)

```bash
cd ~/path/to/83s1c
git push origin main            # after each milestone PR is merged locally
# verify the deploy:
vercel ls 83s1c --scope dwellchecker | head -5
curl -s https://<preview-or-prod-host>/api/health
```

## 8. Staying current with upstream

Do this monthly, or when a security advisory lands:

```bash
git fetch upstream
git checkout -b sync/$(date +%Y-%m)
git merge upstream/main
```

Resolve conflicts, keeping fork-owned files under `src/config/fork/`, `scripts/fork/`, and
`api/fork/`. Re-run the SECURITY §4 gates and open a PR. Expect conflicts mostly in
`vercel.json`, `package.json`, and the variant file.
