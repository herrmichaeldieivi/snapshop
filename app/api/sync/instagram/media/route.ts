import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { describeSocialError } from "@/src/lib/social/errors";
import { listInstagramMedia } from "@/src/lib/social/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const { store } = await authorizeStore(url.searchParams.get("store_id") ?? "");
    if (!takeRateLimit(`ig-list:${store.id}`, 120, 3_600_000)) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    const after = url.searchParams.get("after");
    return NextResponse.json(await listInstagramMedia(store, after && /^[\w=-]{1,300}$/.test(after) ? after : null));
  } catch (error) {
    const described = describeSocialError(error);
    return NextResponse.json({ error: described.message, needsReconnect: described.needsReconnect }, { status: described.status });
  }
}
