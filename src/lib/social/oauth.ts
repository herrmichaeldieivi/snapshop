import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { SocialCandidate } from "@/src/lib/types";
import { metaConfig } from "@/src/lib/social/config";
import { safeEqual, signValue, verifySigned } from "@/src/lib/social/crypto";
import { SocialError } from "@/src/lib/social/errors";
import { graph } from "@/src/lib/social/graph";

export function createOauthState(storeId: string) {
  const nonce = randomBytes(16).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ s: storeId, n: nonce, t: Date.now() })).toString("base64url");
  return { state: signValue("oauth-state", payload), nonce };
}

/** Valid only if the signature checks out, it is fresh, and it matches the nonce cookie set in this browser. */
export function readOauthState(state: string, cookieNonce: string | undefined, now = Date.now(), maxAgeMs = 10 * 60_000) {
  const payload = verifySigned("oauth-state", state);
  if (!payload || !cookieNonce) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { s?: unknown; n?: unknown; t?: unknown };
    if (typeof value.s !== "string" || typeof value.n !== "string" || typeof value.t !== "number") return null;
    if (!safeEqual(value.n, cookieNonce)) return null;
    if (now - value.t > maxAgeMs || value.t > now + 60_000) return null;
    return { storeId: value.s };
  } catch {
    return null;
  }
}

export function buildAuthUrl(state: string, origin?: string) {
  const config = metaConfig(origin);
  if (!config.redirectUri) throw new SocialError("Set NEXT_PUBLIC_SITE_URL so Meta knows where to send people back.", 503);
  const url = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (config.configId) {
    url.searchParams.set("config_id", config.configId);
    url.searchParams.set("override_default_response_type", "true");
  } else {
    url.searchParams.set("scope", config.scopes.join(","));
  }
  return url.toString();
}

/** code → short-lived user token → long-lived (~60 day) user token. */
export async function exchangeCode(code: string, origin?: string) {
  const config = metaConfig(origin);
  const shortLived = await graph<{ access_token: string }>({
    path: "oauth/access_token",
    params: { client_id: config.appId, client_secret: config.appSecret, redirect_uri: config.redirectUri, code },
  });
  const longLived = await graph<{ access_token: string; expires_in?: number }>({
    path: "oauth/access_token",
    params: { grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.appSecret, fb_exchange_token: shortLived.access_token },
  });
  return {
    token: longLived.access_token,
    expiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000).toISOString() : null,
  };
}

export async function fetchFbUserId(userToken: string) {
  return (await graph<{ id: string }>({ path: "me", token: userToken, params: { fields: "id" } })).id;
}

export async function fetchGrantedScopes(userToken: string) {
  const result = await graph<{ data?: { permission: string; status: string }[] }>({ path: "me/permissions", token: userToken });
  return (result.data ?? []).filter((entry) => entry.status === "granted").map((entry) => entry.permission);
}

interface PageRow {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string };
}

const toCandidate = (page: PageRow): SocialCandidate => ({
  page_id: page.id,
  page_name: page.name,
  ig_user_id: page.instagram_business_account?.id ?? null,
  ig_username: page.instagram_business_account?.username ?? null,
});

export async function fetchAccountCandidates(userToken: string): Promise<SocialCandidate[]> {
  const result = await graph<{ data?: PageRow[] }>({
    path: "me/accounts",
    token: userToken,
    params: { fields: "id,name,instagram_business_account{id,username}", limit: 100 },
  });
  return (result.data ?? []).map(toCandidate);
}

/** Page tokens derived from a long-lived user token do not expire. */
export async function fetchPageAccess(userToken: string, pageId: string) {
  const page = await graph<PageRow>({ path: pageId, token: userToken, params: { fields: "id,name,access_token,instagram_business_account{id,username}" } });
  if (!page.access_token) throw new SocialError("Meta did not return a Page token. Make sure you can manage this Page, then reconnect.", 403);
  return { token: page.access_token, candidate: toCandidate(page) };
}

/** Verifies Meta's signed_request (deauthorize + data deletion callbacks). */
export function parseSignedRequest(signed: string, secret: string): { user_id?: string } | null {
  const [signature, payload] = signed.split(".");
  if (!signature || !payload || !secret) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { algorithm?: string; user_id?: string };
    if (data.algorithm && data.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
    return data;
  } catch {
    return null;
  }
}
