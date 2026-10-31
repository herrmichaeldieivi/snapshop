import { headers as nextHeaders } from "next/headers";
import { HttpError } from "@/src/lib/http-error";

type HeaderSource = { get(name: string): string | null };
export class RequestSecurityError extends HttpError { constructor(message = "This request came from an untrusted origin.") { super(message, 403); } }

function originCandidates(source: HeaderSource, requestUrl?: string) {
  const allowed = new Set<string>();
  if (requestUrl) {
    try { allowed.add(new URL(requestUrl).origin); } catch { /* Request URL is framework-provided; ignore malformed values defensively. */ }
  }
  const forwardedHost = source.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || source.get("host");
  const forwardedProto = source.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host && forwardedProto) allowed.add(`${forwardedProto === "http" ? "http" : "https"}://${host}`);
  if (host && !forwardedProto) { allowed.add(`http://${host}`); allowed.add(`https://${host}`); }
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredOrigin) allowed.add(configuredOrigin);
  return allowed;
}

export function assertTrustedOrigin(source: HeaderSource, requestUrl?: string) {
  const rawOrigin = source.get("origin");
  if (!rawOrigin) throw new RequestSecurityError("This action requires a same-origin request.");
  let origin: string;
  try { origin = new URL(rawOrigin).origin; } catch { throw new RequestSecurityError(); }
  if (!originCandidates(source, requestUrl).has(origin)) throw new RequestSecurityError();
}

export function assertTrustedRouteRequest(request: Request) {
  assertTrustedOrigin(request.headers, request.url);
}

export function assertTrustedServerAction() {
  assertTrustedOrigin(nextHeaders());
}

export function requestErrorStatus(error: unknown) {
  if (error instanceof RequestSecurityError) return 403;
  if (error instanceof HttpError) return error.status;
  return 400;
}
