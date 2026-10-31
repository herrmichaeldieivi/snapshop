import { HttpError } from "@/src/lib/http-error";
import { MetaApiError } from "@/src/lib/social/graph";

/** An error whose message is safe and useful to show to the person using the admin panel. */
export class SocialError extends HttpError {}

export interface DescribedError {
  message: string;
  status: number;
  needsReconnect: boolean;
}

export function describeSocialError(error: unknown): DescribedError {
  if (error instanceof MetaApiError) {
    if (error.needsReconnect) return { message: "Meta says this connection expired or was revoked. Reconnect to continue.", status: 401, needsReconnect: true };
    if (error.rateLimited) return { message: "Meta is rate limiting this account. Wait a few minutes and try again.", status: 429, needsReconnect: false };
    if (error.permissionDenied) return { message: `Meta refused this request (permission or role problem): ${error.message}`, status: 403, needsReconnect: false };
    return { message: `Meta error: ${error.message}`, status: 502, needsReconnect: false };
  }
  if (error instanceof HttpError) return { message: error.message, status: error.status, needsReconnect: false };
  return { message: error instanceof Error ? error.message : "Something went wrong.", status: 400, needsReconnect: false };
}
