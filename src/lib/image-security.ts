import dns from "node:dns/promises";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import type { LookupFunction } from "node:net";

export type PinnedAddress = { address: string; family: 4 | 6 };

function ipv4Parts(ip: string) { return ip.split(".").map(Number); }
function isBlockedIpv4(ip: string) {
  const [a, b] = ipv4Parts(ip);
  return a === 0 || a === 10 || (a === 100 && b >= 64 && b <= 127) || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 88 || b === 168)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0) || a >= 224;
}
function isBlockedIpv6(ip: string) {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "::" || normalized === "::1" || normalized.startsWith("::ffff:") || /^(?:fc|fd)/.test(normalized) || /^(?:fe8|fe9|fea|feb)/.test(normalized) || normalized.startsWith("ff") || normalized.startsWith("2001:db8:");
}
export function isBlockedAddress(ip: string) {
  const family = net.isIP(ip.replace(/^\[|\]$/g, ""));
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  return true;
}

function parseUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Image URL must be a valid HTTP or HTTPS URL."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Image URL must use HTTP or HTTPS.");
  if (url.username || url.password) throw new Error("Image URL cannot include credentials.");
  return url;
}

export async function resolveSafeImageUrl(value: string): Promise<{ url: URL; pinned: PinnedAddress }> {
  const url = parseUrl(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal" || hostname === "metadata" || hostname.endsWith(".internal")) throw new Error("Image URL points to a private address.");
  const literalFamily = net.isIP(hostname);
  const addresses = literalFamily ? [{ address: hostname, family: literalFamily }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address))) throw new Error("Image URL points to a private address.");
  const selected = addresses.find((entry) => entry.family === 4) ?? addresses[0];
  return { url, pinned: { address: selected.address, family: selected.family as 4 | 6 } };
}

export async function assertSafeImageUrl(value: string) {
  return (await resolveSafeImageUrl(value)).url;
}

const bare = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, "");
type LookupCallback = (error: Error | null, address: string | { address: string; family: number }[], family?: number) => void;

/**
 * DNS-pinning lookup. Node >= 20 enables autoSelectFamily, which calls lookup with { all: true } and expects an
 * array; answering with a single address makes every connection fail with ERR_INVALID_IP_ADDRESS.
 */
export function pinnedLookup(allowedHost: string, pinned: PinnedAddress) {
  return (hostname: string, options: { all?: boolean } | undefined, callback: LookupCallback) => {
    if (bare(hostname) !== bare(allowedHost)) {
      callback(new Error("Unexpected image host."), options?.all ? [] : "", 4);
      return;
    }
    if (options?.all) callback(null, [{ address: pinned.address, family: pinned.family }]);
    else callback(null, pinned.address, pinned.family);
  };
}

export async function fetchSafeImage(value: string) {
  const { url, pinned } = await resolveSafeImageUrl(value);
  const dispatcher = new Agent({
    connect: { lookup: pinnedLookup(url.hostname, pinned) as unknown as LookupFunction },
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await undiciFetch(url, { dispatcher, signal: controller.signal, redirect: "error", headers: { Accept: "image/jpeg,image/png,image/webp" } });
    if (!response.ok) throw new Error(`Image request failed with ${response.status}.`);
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(type)) throw new Error("Image must be a JPEG, PNG, or WebP file.");
    const size = Number(response.headers.get("content-length") ?? "0");
    if (size > 10 * 1024 * 1024) throw new Error("Image exceeds the 10 MB limit.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 10 * 1024 * 1024) throw new Error("Image exceeds the 10 MB limit.");
    return { bytes, contentType: type };
  } finally {
    clearTimeout(timeout);
    await dispatcher.close();
  }
}
