import { NextResponse } from "next/server";
import { getRepository } from "@/src/lib/repository";
import { parseSignedRequest } from "@/src/lib/social/oauth";

export const runtime = "nodejs";

/** Meta calls this when someone removes the app. Authenticated by the signed_request, not by a session. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const data = parseSignedRequest(String(form?.get("signed_request") ?? ""), process.env.META_APP_SECRET ?? "");
  if (!data?.user_id) return NextResponse.json({ error: "Invalid signed request." }, { status: 400 });
  await getRepository().purgeSocialData(String(data.user_id));
  return NextResponse.json({});
}
