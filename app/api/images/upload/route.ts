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
    const { store } = await authorizeStore(storeId);
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    if (!files.length || files.length > 5) return NextResponse.json({ error: "Upload between one and five images." }, { status: 400 });
    const urls = await Promise.all(files.map((file) => processUploadedImage(store.id, file)));
    return NextResponse.json({ urls });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image upload failed." }, { status: requestErrorStatus(error) });
  }
}
