# CLAUDE.md — 83s1c

Copy this file to the repo root during M0, and keep it there for every future session.

## What this repo is

83s1c is a standalone financial- and world-intelligence dashboard at https://83s1c.online.
It is a fork of World Monitor (koala73/worldmonitor, AGPL-3.0-only), running its finance
variant, plus a fork-owned private-markets module. It is deployed on Vercel team
`dwellchecker`, project `83s1c`.

It is not connected to any other Cartooli product: no shared auth, DB, links, or code.
Don't add any.

## Hard rules

- **License:** never edit `LICENSE`, upstream copyright headers, or attribution. All code
  here is AGPL-3.0-only. The footer Source link must always resolve to the deployed commit.
- **Trademark:** the product name is "83s1c". Don't use "World Monitor" as primary branding;
  "Based on World Monitor" attribution only.
- **Secrets fail closed:** a route that needs an unset secret refuses the request (401,
  403, or 503), never allows it. Every new route ships with a test for that case.
- **No secrets in `VITE_*`, the repo, or logs.** `npm run security:vite-env-secrets` must
  stay in the build.
- **Separate environments:** Preview and Production use separate Upstash DBs and secrets.
  Never point Preview at prod data.
- **Fork-owned code** lives in `src/config/fork/`, `scripts/fork/`, `api/fork/`, and
  `docs/fork/`. Keep edits to upstream files minimal and list each one in `FORK.md`; that's
  what keeps `git merge upstream/main` survivable.
- **Removed surfaces** (desktop, Pro/billing, Clerk, Convex, Dodo, Railway relay, Telegram,
  blog, docs site, publish workflows) stay removed. Don't re-enable them by merging
  upstream.

## Commands

- Dev: `npm run dev:finance`
- Build: `npm run build:finance`
- Check: `npm run typecheck && npm run test:data`, plus the gates in
  `docs/fork/SECURITY-EVIDENCE.md`
- Seed a key locally (Preview DB only): `node scripts/<seed-name>.mjs`
- Sync upstream: see the "Staying current with upstream" section of `docs/fork/` (copied
  from the build packet)

## Working style

- Verify at runtime (open it, read the logs, hit the endpoint) before calling anything done.
- Use small, scoped commits, one concern per PR.
- Check current docs (Context7) before writing Vercel, Upstash, or SEC integration code.
