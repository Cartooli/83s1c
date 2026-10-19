// 83s1c fork-owned: AGPL §13 source offer. Redirects to the public repository at the
// exact deployed commit; falls back to the repository root when the SHA is unknown.
export const config = { runtime: 'edge' };

const REPO = 'https://github.com/Cartooli/83s1c';

export function sourceLocation(sha) {
  return typeof sha === 'string' && /^[0-9a-f]{7,40}$/.test(sha) ? `${REPO}/tree/${sha}` : REPO;
}

export default function handler() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: sourceLocation(process.env.VERCEL_GIT_COMMIT_SHA),
      'Cache-Control': 'no-store',
    },
  });
}
