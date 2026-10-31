export type MetaMode = "live" | "mock" | "unconfigured";

export const DEFAULT_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
];

const isDemoBackend = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * live        – real Meta credentials are configured.
 * mock        – preview mode (sample posts, nothing is ever posted). On automatically in demo mode without Meta
 *               credentials, or forced with META_MOCK=1.
 * unconfigured – a real backend without Meta credentials: we refuse to fake it.
 */
export function metaMode(): MetaMode {
  if (process.env.META_MOCK === "1") return "mock";
  if (process.env.META_APP_ID && process.env.META_APP_SECRET) return "live";
  return isDemoBackend() ? "mock" : "unconfigured";
}

export function siteOrigin(fallback?: string): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configured || fallback?.replace(/\/+$/, "") || null;
}

/** Meta's servers must be able to fetch our photos, so localhost and private hosts can't work. */
export function isPublicHttpsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (url.protocol !== "https:") return false;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost")) return false;
    if (/^(127\.|10\.|192\.168\.|0\.0\.0\.0|169\.254\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function metaConfig(origin?: string) {
  const site = siteOrigin(origin);
  const version = process.env.META_GRAPH_VERSION?.trim() ?? "";
  const scopes = (process.env.META_SCOPES ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  return {
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    version: /^v\d+\.\d+$/.test(version) ? version : "v26.0",
    configId: process.env.META_LOGIN_CONFIG_ID?.trim() || null,
    scopes: scopes.length ? scopes : DEFAULT_SCOPES,
    redirectUri: site ? `${site}/api/meta/callback` : "",
  };
}
