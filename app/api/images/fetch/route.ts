import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { processImportedImage } from "@/src/lib/image-pipeline";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const { store_id, url } = await request.json() as { store_id?: string; url?: string };
    if (!store_id || !url) return NextResponse.json({ error: "Store and image URL are required." }, { status: 400 });
    const { store } = await authorizeStore(store_id);
    const imageUrl = await processImportedImage(store.id, url);
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image fetch failed." }, { status: requestErrorStatus(error) });
  }
}
