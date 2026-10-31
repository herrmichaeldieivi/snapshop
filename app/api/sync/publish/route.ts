import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeStore } from "@/src/lib/access";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { assertTrustedRouteRequest } from "@/src/lib/request-security";
import { describeSocialError } from "@/src/lib/social/errors";
import { publishProduct } from "@/src/lib/social/service";
import type { SocialChannel } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const body = (await request.json()) as { store_id?: string; product_id?: string; channels?: unknown; repost?: unknown };
    const channels = Array.isArray(body.channels) ? body.channels.filter((value): value is SocialChannel => value === "instagram" || value === "facebook") : [];
    if (!body.store_id || !body.product_id || !channels.length) return NextResponse.json({ error: "Choose a product and at least one channel." }, { status: 400 });
    const { store } = await authorizeStore(body.store_id);
    if (!takeRateLimit(`publish:${store.id}`, 40, 3_600_000)) return NextResponse.json({ error: "Posting limit reached for this hour. Try again later." }, { status: 429 });
    const results = await publishProduct(store, body.product_id, channels, new URL(request.url).origin, body.repost === true);
    revalidatePath(`/admin/${store.id}/sync`);
    console.info(JSON.stringify({ event: "social_publish", store_slug: store.slug, results: results.map((entry) => `${entry.channel}:${entry.status}`) }));
    return NextResponse.json({ results });
  } catch (error) {
    const described = describeSocialError(error);
    return NextResponse.json({ error: described.message, needsReconnect: described.needsReconnect }, { status: described.status });
  }
}
