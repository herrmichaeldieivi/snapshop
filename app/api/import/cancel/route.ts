import { NextResponse } from "next/server";
import { authorizeStore } from "@/src/lib/access";
import { getRepository } from "@/src/lib/repository";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
    const { store_id, import_id } = await request.json() as { store_id?: string; import_id?: string };
    if (!store_id || !import_id) return NextResponse.json({ error: "Store and import are required." }, { status: 400 });
    const { store } = await authorizeStore(store_id);
    await getRepository().cancelImport(store.id, import_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not cancel import." }, { status: requestErrorStatus(error) });
  }
}
