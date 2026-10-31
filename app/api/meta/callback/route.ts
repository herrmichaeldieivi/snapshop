import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { authorizeStore } from "@/src/lib/access";
import { completeConnect } from "@/src/lib/social/connect";
import { describeSocialError, SocialError } from "@/src/lib/social/errors";
import { MetaApiError } from "@/src/lib/social/graph";
import { readOauthState } from "@/src/lib/social/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const done = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url));
    response.cookies.set("snapshop_meta_nonce", "", { path: "/api/meta", maxAge: 0 });
    return response;
  };
  const state = readOauthState(url.searchParams.get("state") ?? "", cookies().get("snapshop_meta_nonce")?.value);
  if (!state) return done("/admin");
  const base = `/admin/${state.storeId}/sync`;
  if (url.searchParams.get("error")) return done(`${base}?error=denied`);
  const code = url.searchParams.get("code");
  if (!code) return done(`${base}?error=generic`);
  try {
    const { store } = await authorizeStore(state.storeId);
    await completeConnect(store, code, url.origin);
    revalidatePath(base);
    return done(`${base}?connected=1`);
  } catch (error) {
    const described = describeSocialError(error);
    console.error(JSON.stringify({ event: "meta_connect_failed", status: described.status, message: described.message }));
    if (described.status === 401 && !(error instanceof MetaApiError)) return done("/login");
    return done(`${base}?error=${error instanceof MetaApiError ? "exchange" : error instanceof SocialError ? "nopages" : "generic"}`);
  }
}
