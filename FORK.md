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
