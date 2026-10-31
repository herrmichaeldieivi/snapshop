import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { beginConnect } from "@/src/lib/social/connect";
import { describeSocialError } from "@/src/lib/social/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const storeId = url.searchParams.get("store_id") ?? "";
  try {
    const { store } = await authorizeStore(storeId);
    const { url: target, nonce } = beginConnect(store.id, url.origin);
    const response = NextResponse.redirect(target);
    response.cookies.set("snapshop_meta_nonce", nonce, { httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", maxAge: 600, path: "/api/meta" });
    return response;
  } catch (error) {
    const described = describeSocialError(error);
    if (described.status === 401) return NextResponse.redirect(new URL("/login", url));
    if (described.status === 404 || !storeId) return NextResponse.redirect(new URL("/admin", url));
    return NextResponse.redirect(new URL(`/admin/${encodeURIComponent(storeId)}/sync?error=${described.status === 503 ? "unconfigured" : "generic"}`, url));
  }
}
