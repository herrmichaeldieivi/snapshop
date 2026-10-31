import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRepository } from "@/src/lib/repository";
import { siteOrigin } from "@/src/lib/social/config";
import { parseSignedRequest } from "@/src/lib/social/oauth";

export const runtime = "nodejs";

/** Meta's "data deletion request" callback: delete everything we hold for that Facebook user and return a receipt. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const data = parseSignedRequest(String(form?.get("signed_request") ?? ""), process.env.META_APP_SECRET ?? "");
  if (!data?.user_id) return NextResponse.json({ error: "Invalid signed request." }, { status: 400 });
  await getRepository().purgeSocialData(String(data.user_id));
  return NextResponse.json({ url: `${siteOrigin(new URL(request.url).origin)}/privacy`, confirmation_code: randomUUID() });
}
