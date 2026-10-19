# 83s1c — Functional + Technical Spec

Tags: **[V]** means verified on 2026-10-19 against upstream code at SHA
`4e83ff7ef1ae029d29393b9f0d1c5b29650ad9b1` or a live check. **[I]** means inferred.
**[A]** means assumed; verify it before relying on it.

## 1. What it is

83s1c is a real-time financial-intelligence dashboard: a world map plus live panels covering
public markets, macro indicators, news, and public video feeds, with a private-markets layer
added on top. It is a fork of World Monitor's existing **finance variant** [V], not a rewrite.
Upstream already ships these finance and macro pieces [V]:
- market quotes and a watchlist
- crypto and stablecoins
- FX
- FRED rates
- an economic calendar and an earnings calendar
- ETF flows
- yield curves (US and 8 others)
- prediction markets
- market breadth and Fear & Greed
- BIS policy rates
- curated news with AI briefs
- verified live video (broadcaster HLS, then the official YouTube IFrame API) [V]

The product is standalone. It has no accounts, no billing, and no links to Cartooli apps.
It is read-only for viewers.

## 2. Users and jobs

The primary user is Rob, an operator watching markets and world events together. The
secondary audience is public read-only visitors. The one job: see what moved, why it moved
(news and events), and where it happened on the map, on one screen, with every number
sourced.

## 3. Brand (single source of truth)

Create `src/config/brand.ts` (fork-owned) with `name: "83s1c"`, `origin:
"https://83s1c.online"`, `sourceUrl` (the public repo URL, set at M5), `upstreamName:
"World Monitor"`, and `upstreamUrl: "https://github.com/koala73/worldmonitor"`.
Route every user-visible name, title, OG/meta, manifest, and favicon through it.
- Remove the World Monitor name, logo, and visual identity from primary branding, as the
  trademark policy requires [V]. Keep factual attribution.
- Footer on every page: "83s1c · Based on World Monitor (AGPL-3.0) · Source · License".
- About 595 non-docs files reference `worldmonitor.app` [V]. Don't mass-replace. Change
  only runtime hosts, redirects, canonicals, and emails, and delete the surfaces in §4.
  Leave attribution and notices intact.
- `vercel.json` hard-codes `*.worldmonitor.app` redirects [V]. Replace it with a minimal
  fork-owned config: security headers, `/` → `/dashboard`, and no cross-host redirects.

## 4. Strip list (remove or disable; don't leave half-wired)

| Remove | Why |
|---|---|
| `src-tauri/`, desktop scripts and workflows | No desktop app |
| `cli/`, `sdk/`, publish-* workflows, `mcp-grant.html`, `plugin.*`, `server.json`, `mcp.json` | Not shipping clients or a hosted MCP. Keep `/api/mcp` only if `WORLDMONITOR_VALID_KEYS` is set; otherwise it must 401 |
| Pro/paywall (`build:pro`, `pro-test/`, Dodo payments, Clerk, Convex, entitlement UI) | No accounts or billing; this removes the largest auth surface |
| Blog site, docs site, SEO crawlable corpus, IndexNow, GSC | Not a content site |
| Railway relay, AIS/WS relay, Docker seed bundles | Not our infra. Disable AIS, flight, and WS layers in the finance variant |
| Umami analytics, Sentry DSNs, Telegram bot, Resend senders `@worldmonitor.app` | Upstream-owned endpoints. Re-add our own later if wanted |

Each removal should be its own commit, and the finance build must stay green after each.

## 5. Variant fix and panel set

**Bug to patch [V]:** `src/config/variant.ts` picks the variant from the hostname
(`finance.*` → finance) and falls back to `'full'` for every other host. As a result,
83s1c.online would render **full** even with `VITE_VARIANT=finance`. Patch the final
`return 'full'` to `return buildVariant`, add a unit test for it, and note it in `FORK.md`.
It's one line, so upstream merges stay easy.

Default panels for the finance variant:
- Markets/watchlist, Commodities, FX, Crypto, Macro Signals, FRED/BIS rates, Yield Curve
- Economic Calendar, Earnings Calendar, ETF Flows, Market Breadth, Fear & Greed
- News (finance + world), Live Video

Map layers: conflict and hotspots, sanctions, economic, chokepoints/waterways, weather and
natural events, and outages (all world-context layers). AIS and flight layers stay off.

**Second bug to patch [V]:** `api/_cors.js` allows only `*.worldmonitor.app` and
`worldmonitor-*-eliewm.vercel.app`. As written, every API call from 83s1c.online and from
our previews is rejected. Add exactly two anchored patterns:
`^https:\/\/(?:www\.)?83s1c\.online$` and `^https:\/\/83s1c-[a-z0-9-]+-dwellchecker\.vercel\.app$`.
Never add a bare `*.vercel.app` (upstream's own comment calls this list a security
allowlist). Then remove the upstream patterns; we don't serve their hosts. Add tests for
both the allowed hosts and a lookalike host such as `83s1c.online.evil.com`.

Fork-owned overrides live in `src/config/fork/` so `git merge upstream/main` touches few
files [I].

## 6. Private-markets module (M6 — net-new, fork-owned code)

Upstream has no private-markets coverage [V: no seeders or routes for it].

- **Source 1: SEC EDGAR Form D** (exempt offerings by private companies and funds). The data
  is public. The fair-access policy requires a declared User-Agent with a contact address,
  at most 10 requests/second [A: confirm current SEC policy page], and the latest-filings
  feed filtered to form type D [A: confirm endpoint].
- **Source 2: private-market deal news** from public RSS feeds, shown as headline plus link
  only (the same pattern upstream uses for news).
- **Seeder:** `scripts/fork/seed-sec-form-d.mjs` writes the key `privateMarkets:formD:v1`
  to Upstash with `fetchedAt`, in the same shape as upstream seeders.
- **Route:** `GET /api/fork/private-markets/v1/list-form-d` is a read-only edge function
  serving from cache. It is rate-limited and never calls the SEC at request time.
- **Panel: "Private Capital Raises"** shows issuer, state, industry, offering amount,
  amount sold, filing date, and a link to the filing. Filters: industry, size, state, 7 or
  30 days.
- **Map layer:** issuer state centroid (US only) with bubble size set by offering amount.
- **Not in scope:** paid PitchBook/Crunchbase-style datasets, scraping, or anything behind a
  login.

## 7. Architecture (keep upstream's, swap the hosts)

- Frontend: vanilla TypeScript, Vite, deck.gl/MapLibre plus globe.gl [V].
- API: Vercel Edge Functions in `api/` [V].
- Cache: Upstash Redis [V], with **separate DBs for Preview and Production** [decision].
- Seeders: upstream runs about 221 seed scripts [V] on Railway. We run only the finance
  subset (ENV-AND-INFRA §5) on **GitHub Actions cron**, which needs no new vendor.
- Node 24 (from `.nvmrc`) [V].

## 8. Acceptance criteria (definition of done for M0–M5)

1. https://83s1c.online loads the finance variant. The footer shows attribution and the
   Source link resolves to public source code.
2. These panels show data less than 2 hours old: Markets, FX, Macro, Economic Calendar,
   News, and Live Video. Any empty panel says why (upstream's `unavailable` reasons) rather
   than staying blank [V behavior].
3. Requests without a key get no premium, admin, or MCP route: each returns 401 or 403.
4. There are no `worldmonitor.app` network calls at runtime. Check the network tab on
   /dashboard; requests to the YouTube embed domain are allowed.
5. `npm run typecheck`, the unit tests that remain, `security:vite-env-secrets`, and gitleaks
   all pass in CI on `main`.
6. `FORK.md` lists the upstream SHA, every change (AGPL §5(a)), and the merge procedure.

## 9. Risks

- **Riskiest assumption:** that the finance subset of upstream's seeders runs reliably
  from GitHub Actions on a schedule. If the seeders don't run, the panels go empty. That is
  why M4's gate is "panels show data", not "build passes".
- **Data licensing (decided 2026-10-19):**
  - Alpha Vantage's ToS treats providing its data in an activity that lets others access it
    as commercial use, and directs that use to premium@alphavantage.co [V].
  - Finnhub's free tier is described as personal and non-commercial [I: secondary source;
    finnhub.io/terms blocks fetching].
  - Upstream rejects FMP and flags Yahoo for multi-user display [V].
  - Therefore the public site shows open data only, and quotes live on the
    authentication-gated desk deployment (00-RUN prompt, Decisions §2).
- **Upstream velocity:** 8,578 commits and activity today [V]. Merge monthly and run the
  §8 checks after each merge.
