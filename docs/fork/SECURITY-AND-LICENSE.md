# 83s1c — License, trademark, and security gates

This is not legal advice; the AGPL text in `LICENSE` controls. Tags: [V] means verified
2026-10-19 against upstream's license and trademark docs and its code.

## 1. What forking obligates (AGPL-3.0-only) [V]

| Obligation | How 83s1c meets it |
|---|---|
| Keep copyright and license notices intact | Never edit `LICENSE` or upstream headers; the rebrand touches UI strings only |
| Modified versions stay AGPL-3.0-only | `package.json` keeps `"license": "AGPL-3.0-only"`. Our new code (incl. the private-markets module) is AGPL too, because it ships in the same program |
| Prominently offer corresponding source to users of a modified **public network deployment** | Footer "Source" link plus `/source` page pointing to the public repo at the deployed commit SHA (inject `VERCEL_GIT_COMMIT_SHA`) |
| Document the changes you made | `FORK.md`: upstream SHA, dated change log, merge procedure |
| Commercial use | Permitted under AGPL; private-source use needs a separate commercial license from the maintainer |

**What this means for Rob:**

- A forked AGPL codebase can't be "owned" proprietarily. You own your additions'
  copyright, but they ship under AGPL.
- The repo is private today [V]. A public site with a private repo does not meet the
  source-offer obligation.
- Two compliant options:
  - **(a)** make `Cartooli/83s1c` public (recommended; simplest, and secrets are never in
    the repo anyway); or
  - **(b)** keep the repo private and publish each deployed commit to a public mirror.
- If the site stays behind Vercel Authentication for Rob only, there are no outside users to
  offer source to, but notices still stay.
- **A rebuild** (new code that merely reads the upstream design) carries no AGPL obligation.
  It does cost you the 8.5k commits of hardening, so the fork is the right call for "build
  on top of".

## 2. Trademark [V]

- The code license grants no rights to the World Monitor name, logo, or visual identity.
- Forks must use distinct branding and include factual attribution ("Based on World
  Monitor" plus a repo link).
- Don't imply endorsement, and don't register confusingly similar names or domains.
- 83s1c.online with "83s1c" branding complies. Never title pages "World Monitor".

## 3. Upstream infra to neutralize before the first push

Upstream has about 50 workflows [V]. In your repo, they'd run with your Actions minutes.
The publish, deploy, and release workflows would fail or, worse, try to act on things you
don't own.

- **Allow-list (keep):** `codeql.yml`, `security-audit.yml`, `typecheck.yml`,
  `lint-code.yml`, `test.yml`, `proto-check.yml` (no secrets) [V].
- **Review and decide:** `deploy-gate.yml` (scheduled, no secrets; keep only if it doesn't
  target upstream hosts) and `feed-validation.yml` (needs Upstash secrets; point it at the
  Preview DB or drop it).
- **Delete everything else**, including every `railway-*`, `publish-*`, `desktop-*`,
  `build-desktop`, `convex-deploy`, `docker-publish`, `umami-*`, `seo-*`, `indexnow-*`,
  `github-stars-*`, `mcp-*`, and `live-video-source-audit` (it needs a residential-proxy
  secret) [V].
- **Add:** a gitleaks workflow on push and PR; keep `dependabot.yml` [V exists].

## 4. Security gates (M3; evidence goes in `docs/fork/SECURITY-EVIDENCE.md`)

1. **Fail-closed secrets.** For every route under `api/` that reads a secret:
   - with the env var unset, the request is refused (401, 403, or 503), never allowed;
   - write a test per route class (premium, MCP, admin `/api/local-*`, rss-proxy, bootstrap).
   This is Rob's top recurring bug class, so prove it by test, not by inspection.
2. **MCP:** with `WORLDMONITOR_VALID_KEYS` unset, `POST /api/mcp tools/call` returns 401
   [behavior per upstream SELF_HOSTING; verify on preview].
3. **No client secrets:**
   - `npm run security:vite-env-secrets -- --strict-local` and
     `npm run security:local-env-dumps` pass [V scripts exist];
   - grep the built `dist/` for each server secret name and value pattern; expect 0 hits.
4. **Secret scan:** gitleaks over the full history passes (upstream history included).
5. **Dependencies:** `npm audit --omit=dev` shows no high/critical issues, or each one is
   documented with a reason.
6. **Headers:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, and
   frame-ancestors 'none' are present on `/dashboard`. Keep upstream `middleware.ts` headers
   and check them with `curl -I`.
7. **Rate limiting:** upstream rate limits need Upstash [V lint script exists]. Confirm a
   burst of 100 requests to one API route gets 429s on preview.
8. **Environment isolation:**
   - Preview and Production use different Upstash DBs and different secrets;
   - Vercel Deployment Protection is on for Preview;
   - no production secret exists in the Preview env.
9. **SSRF:** `api/rss-proxy` must only fetch allow-listed feed hosts. Test it with
   `http://169.254.169.254/`, `http://localhost`, and a non-listed host; all must be
   refused.
10. **CORS:**
    - `curl -sI -H 'Origin: https://83s1c.online'` on an API route returns the CORS allow
      header;
    - `Origin: https://83s1c.online.evil.com` and `Origin: https://x.vercel.app` do not.
11. **Runtime:** there are no outbound calls to `*.worldmonitor.app` (network tab plus
    `rg "worldmonitor\.app" dist/`, except attribution text).
12. **SECURITY.md:** replace the upstream reporting contact with Cartooli's, and keep a
    note that upstream issues go upstream.
13. **Branch protection on `main`:** PR required, the allow-listed checks required, and no
    force-push.
