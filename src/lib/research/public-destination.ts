/** Cap redirect hops so a malicious Location chain cannot loop forever. */
const MAX_REDIRECTS = 10;

const METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.google',
]);

/**
 * True for IPv4 literals in loopback, link-local, or RFC1918 private space.
 * Hostnames that are not dotted-decimal are left to the caller.
 */
function isBlockedIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) return NaN;
    return Number(part);
  });
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = octets as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** Expand a compressed IPv6 literal into eight lowercase hextets, or null. */
function expandIpv6(host: string): string[] | null {
  const lower = host.toLowerCase();
  if (!/^[0-9a-f:]+$/.test(lower) || !lower.includes(':')) return null;

  const sides = lower.split('::');
  if (sides.length > 2) return null;

  const parseSide = (side: string): string[] =>
    side.length === 0 ? [] : side.split(':');

  let head = parseSide(sides[0] ?? '');
  const tail = sides.length === 2 ? parseSide(sides[1] ?? '') : [];

  if (sides.length === 1) {
    if (head.length !== 8) return null;
  } else {
    const missing = 8 - head.length - tail.length;
    if (missing < 0) return null;
    head = [...head, ...Array.from({ length: missing }, () => '0'), ...tail];
  }

  if (head.length !== 8) return null;
  if (head.some((h) => h.length === 0 || h.length > 4 || !/^[0-9a-f]+$/.test(h))) {
    return null;
  }
  return head.map((h) => h.padStart(4, '0'));
}

function isBlockedIpv6(host: string): boolean {
  const hextets = expandIpv6(host);
  if (!hextets) return false;

  // ::1 loopback
  if (hextets.every((h, i) => (i === 7 ? h === '0001' : h === '0000'))) {
    return true;
  }
  // :: (unspecified)
  if (hextets.every((h) => h === '0000')) return true;

  const first = Number.parseInt(hextets[0]!, 16);
  // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfe80) return true;
  // fc00::/7 unique local
  if ((first & 0xfe00) === 0xfc00) return true;

  // IPv4-mapped ::ffff:a.b.c.d
  if (
    hextets[0] === '0000' &&
    hextets[1] === '0000' &&
    hextets[2] === '0000' &&
    hextets[3] === '0000' &&
    hextets[4] === '0000' &&
    hextets[5] === 'ffff'
  ) {
    const hi = Number.parseInt(hextets[6]!, 16);
    const lo = Number.parseInt(hextets[7]!, 16);
    const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isBlockedIpv4(v4);
  }

  return false;
}

function hostnameIsBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (METADATA_HOSTS.has(host)) return true;
  if (isBlockedIpv4(host)) return true;
  if (isBlockedIpv6(host)) return true;
  return false;
}

/**
 * Research collectors may only request public http(s) destinations. Rejects
 * loopback, link-local, private, and known cloud-metadata hosts. Does not
 * resolve DNS (rebinding is out of scope for this slice).
 */
export function assertPublicResearchDestination(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Research destination is not a valid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Research destination must be http or https');
  }

  if (!parsed.hostname || hostnameIsBlocked(parsed.hostname)) {
    throw new Error(
      `Research destination blocked: non-public host "${parsed.hostname || '(empty)'}"`,
    );
  }

  return parsed.href;
}

/**
 * Resolve a redirect Location against the current request URL and re-check
 * the next hop with the same public-destination rules.
 */
export function nextPublicResearchUrl(current: string, location: string): string {
  let next: URL;
  try {
    next = new URL(location, current);
  } catch {
    throw new Error('Redirect Location is not a valid URL');
  }
  return assertPublicResearchDestination(next.href);
}

/**
 * Fetch HTML for research collectors. Validates the initial URL and every
 * redirect hop; never auto-follows redirects without re-checking the host.
 */
export async function fetchResearchResponse(
  url: string,
  init: { headers?: HeadersInit; signal?: AbortSignal } = {},
): Promise<Response> {
  let current = assertPublicResearchDestination(url);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      redirect: 'manual',
      headers: init.headers,
      signal: init.signal,
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(`Redirect ${response.status} without Location`);
    }

    // Drain so the connection can close; body is unused on redirect hops.
    await response.arrayBuffer().catch(() => undefined);
    current = nextPublicResearchUrl(current, location);
  }

  throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
}
