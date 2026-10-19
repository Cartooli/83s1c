// 83s1c fork-owned: API surfaces the fork removed (SPEC §4) answer 404 at the edge,
// before any handler runs. Several of these handlers degrade to a 200/302 when their
// secrets are unset (e.g. customer-portal redirected to worldmonitor.app); refusing
// the whole surface keeps "secrets fail closed" true without patching each handler.
export const REMOVED_API_PREFIXES = [
  // accounts, sessions for Pro users, referrals, API-key management
  '/api/user/',
  '/api/me/',
  '/api/referral/',
  '/api/invalidate-user-api-key-cache',
  '/api/agent-auth',
  // billing
  '/api/create-checkout',
  '/api/customer-portal',
  '/api/product-catalog',
  // hosted MCP OAuth / grants (/api/mcp itself stays; it 401s without WORLDMONITOR_VALID_KEYS)
  '/api/oauth/',
  '/api/internal/',
  // Pro notifications and briefs
  '/api/slack/',
  '/api/discord/',
  '/api/channel-oauth-bind',
  '/api/notification-channels',
  '/api/notification-suppressions',
  '/api/notify',
  '/api/brief/',
  '/api/latest-brief',
  // Pro widgets
  '/api/widget-agent',
  '/api/embed/entitlement',
  // upstream ops and desktop distribution
  '/api/cache-purge',
  '/api/seed-contract-probe',
  '/api/download',
  '/api/version',
] as const;

export function isRemovedApiPath(pathname: string): boolean {
  return REMOVED_API_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}.`));
}

export function removedApiResponse(): Response {
  return new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
