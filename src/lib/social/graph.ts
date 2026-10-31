import { createHmac } from "node:crypto";
import { metaConfig } from "@/src/lib/social/config";

export class MetaApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number, readonly subcode?: number) {
    super(message);
    this.name = "MetaApiError";
  }
  get needsReconnect() {
    return this.code === 190;
  }
  get rateLimited() {
    return this.code !== undefined && [4, 17, 32, 613, 80001, 80002, 80006].includes(this.code);
  }
  get permissionDenied() {
    return this.code === 10 || (this.code !== undefined && this.code >= 200 && this.code <= 299);
  }
}

export interface GraphRequest {
  path: string;
  method?: "GET" | "POST";
  token?: string;
  params?: Record<string, string | number | boolean | undefined>;
  host?: string;
}

/** Minimal Graph API client. Tokens go in the Authorization header, never in URLs or logs. */
export async function graph<T = Record<string, unknown>>(request: GraphRequest): Promise<T> {
  const config = metaConfig();
  const method = request.method ?? "GET";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(request.params ?? {})) if (value !== undefined) params.set(key, String(value));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.token) {
    headers.Authorization = `Bearer ${request.token}`;
    // Harmless when "Require App Secret" is off; mandatory when it is on.
    if (config.appSecret) params.set("appsecret_proof", createHmac("sha256", config.appSecret).update(request.token).digest("hex"));
  }
  const base = `https://${request.host ?? "graph.facebook.com"}/${config.version}/${request.path.replace(/^\/+/, "")}`;
  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(25_000), cache: "no-store" };
  let target = base;
  if (method === "GET") target = `${base}?${params.toString()}`;
  else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = params.toString();
  }
  const response = await globalThis.fetch(target, init);
  let body: { error?: { message?: string; code?: number; error_subcode?: number } } & Record<string, unknown> = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    /* non-JSON error page */
  }
  if (!response.ok || body.error) {
    const error = body.error ?? {};
    throw new MetaApiError(String(error.message ?? `Meta returned HTTP ${response.status}.`).slice(0, 300), response.status, error.code, error.error_subcode);
  }
  return body as T;
}
