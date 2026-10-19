# 83s1c — one-shot Claude Code build prompt

Paste everything below the line into Claude Code, started in a local clone of
`Cartooli/83s1c`, with the other four packet files copied into `./fork-packet/`.

---

You are forking the open-source World Monitor dashboard (github.com/koala73/worldmonitor,
AGPL-3.0-only) into the private-for-now repo `Cartooli/83s1c`. You will rebrand it, harden it,
and deploy it to Vercel team `dwellchecker` at `https://83s1c.online`. The product is a
standalone, news- and world-focused financial-intelligence dashboard. It does not connect to
any other Cartooli app: no shared auth, DB, links, or code.

Read these first, in full, before any command: `fork-packet/SPEC.md`,
`fork-packet/SECURITY-AND-LICENSE.md`, `fork-packet/ENV-AND-INFRA.md`, `fork-packet/CLAUDE.md`.
They are the contract. Where this prompt and those files disagree, stop and ask.

## Decisions already made (Rob, 2026-10-19)

1. **Source access:** `Cartooli/83s1c` goes **public at M5**. It stays private, with the
   site behind Vercel Authentication, through M0–M4. Before making the repo public, gitleaks
   must pass on the full history and `.env*` must be gitignored.
2. **Market data on the public site:** open-licensed sources only. Two deployments come from
   one repo:
   - **Production `83s1c.online` (public):** `VITE_MARKET_QUOTES=0`. Show FRED macro
     (with series-level attribution), US Treasury yields, ECB FX, SEC EDGAR, the economic
     calendar, news (headline plus link only), live video (official embeds), and the map
     layers. Hide every panel fed by Finnhub, Alpha Vantage, or Yahoo: equity, ETF,
     commodity, and earnings quotes.
   - **Private desk `desk.83s1c.online`:** Vercel Authentication always on, with Rob as the
     only viewer and `VITE_MARKET_QUOTES=1`. Use a separate Vercel project or a protected
     custom environment, and give it its own Upstash DB.
   - Before M5, audit every remaining public panel's provider against upstream's
     data-sources catalog (license-posture column). Hide any source that doesn't permit
     public display, and record the result in `docs/fork/DATA-LICENSES.md`.

## Milestones — do them in order, each ends at a gate

**M0 — Fork with history (no feature changes).**
Add `upstream` = koala73/worldmonitor. Fetch full history. Merge into `main` with
`--allow-unrelated-histories`, delete the placeholder file `rsrr`, and commit.
Record the upstream SHA you forked from in `FORK.md`.
Gate: `git log upstream/main..main` shows only your commits.

**M1 — Neutralize upstream infra (before the first push).**
Follow SECURITY-AND-LICENSE.md §3 exactly: disable or delete the upstream GitHub workflows
on the deny-list, and remove the desktop, publish, Railway, Convex, Clerk, Dodo, Telegram,
analytics, and Sentry wiring per SPEC.md §4.
Gate: `rg -n 'secrets\.' .github/workflows` lists only workflows on the allow-list.

**M2 — Rebrand and finance variant.**
Apply SPEC.md §3 (brand config) and §5 (the variant fix, the CORS allowlist fix, and the
finance panel set). Never edit or
remove copyright or license notices; add attribution, don't replace it.
Gate: `npm ci && npm run typecheck && npm run build:finance` pass. Then `npm run preview`,
open it, and confirm that the finance variant renders and the footer shows "Based on World
Monitor" plus a Source link. Take a screenshot as proof.

**M3 — Security gates.**
Run every check in SECURITY-AND-LICENSE.md §4. Any premium, MCP, or admin route must return
401/403 with no key. It must never fail open.
Gate: all §4 checks are green. Paste the evidence (command plus output) into
`docs/fork/SECURITY-EVIDENCE.md`.

**M4 — Vercel deploy (preview first).**
Follow ENV-AND-INFRA.md §2–§4: create the project, provision a separate Upstash instance per
environment, set env vars, and enable deployment protection on previews.
Gate: the preview URL loads and `/api/health` returns OK. Run the data seeders via GitHub
Actions (ENV-AND-INFRA.md §5) and confirm that at least the Markets, FX, Macro/FRED,
Economic Calendar, News, and Live Video panels show data.

**M5 — Domain and production.** STOP before this milestone and ask Rob to confirm two
irreversible items:
(a) make `Cartooli/83s1c` public, or approve a public source mirror (the AGPL source offer);
(b) change the GoDaddy DNS records.
After his yes, add the domain and verify TLS, production health, and the source link.

**M6 — Private-markets module (new code, ours).** Build SPEC.md §6 behind the flag
`VITE_PRIVATE_MARKETS=1`. Gate: unit tests pass, the panel renders with real SEC data on
preview, and the SEC User-Agent and rate limit are enforced.

## Rules

- Use small, scoped commits: one milestone per PR into `main`. Never mix the rebrand with
  logic changes.
- Check current docs (Context7) before writing Vercel, Upstash, or SEC integration code.
- Never put a secret in the repo, in a `VITE_*` var, or in a commit message. The build
  already runs `security:vite-env-secrets --strict-local`; keep it on.
- If an upstream script or test needs infra we removed, skip it explicitly in config with a
  comment. Never delete a test to make CI green.
- Prove each gate at runtime (run it, open it, read the logs), not by reading source.
- Exit condition: M0–M4 green, then stop and ask before M5. Do M6 only after M5 is live,
  or if Rob says so.
- End with a one-line status: done / done-but-one-step-left / blocked-on-Rob. Also give the
  exact `git push` commands if you couldn't push yourself.
