import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { processUploadedImage } from "@/src/lib/image-pipeline";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const formData = await request.formData();
    const storeId = String(formData.get("store_id") ?? "");
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose one logo image." }, { status: 400 });
    const { store } = await authorizeStore(storeId);
    const url = await processUploadedImage(store.id, file, "store-logos");
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Logo upload failed." }, { status: requestErrorStatus(error) });
  }
}
