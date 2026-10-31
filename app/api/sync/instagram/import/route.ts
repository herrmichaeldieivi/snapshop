import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeStore } from "@/src/lib/access";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { assertTrustedRouteRequest } from "@/src/lib/request-security";
import { describeSocialError } from "@/src/lib/social/errors";
import { importInstagramMedia } from "@/src/lib/social/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const body = (await request.json()) as { store_id?: string; media_ids?: unknown };
    const ids = Array.isArray(body.media_ids) ? body.media_ids.filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id)) : [];
    if (!body.store_id || !ids.length || ids.length > 6) return NextResponse.json({ error: "Choose between 1 and 6 posts per request." }, { status: 400 });
    const { store } = await authorizeStore(body.store_id);
    for (let index = 0; index < ids.length; index += 1) {
      if (!takeRateLimit(`ig-import:${store.id}`, 300, 3_600_000)) return NextResponse.json({ error: "Import limit reached for this hour. Try again later." }, { status: 429 });
    }
    const results = await importInstagramMedia(store, ids);
    revalidatePath(`/admin/${store.id}/products`);
    revalidatePath(`/admin/${store.id}/sync`);
    revalidatePath(`/s/${store.slug}`);
    console.info(JSON.stringify({ event: "instagram_import", store_slug: store.slug, imported: results.filter((entry) => entry.status === "imported").length, failed: results.filter((entry) => entry.status === "failed").length }));
    return NextResponse.json({ results });
  } catch (error) {
    const described = describeSocialError(error);
    return NextResponse.json({ error: described.message, needsReconnect: described.needsReconnect }, { status: described.status });
  }
}
