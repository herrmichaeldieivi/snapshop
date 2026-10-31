import { NextResponse } from "next/server";
import { z } from "zod";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

const eventSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("storefront_view"), store_slug: z.string().max(40) }),
  z.object({ name: z.literal("product_view"), store_slug: z.string().max(40), product_id: z.string().uuid().or(z.string().regex(/^p-[\w-]+$/)) }),
  z.object({ name: z.literal("order_click"), store_slug: z.string().max(40), product_id: z.string().uuid().or(z.string().regex(/^p-[\w-]+$/)), channel: z.enum(["whatsapp", "email", "instagram"]) }),
  z.object({ name: z.literal("import_committed"), store_slug: z.string().max(40), imported_count: z.number().int().min(0).max(200), error_count: z.number().int().min(0).max(200) }),
]);

export async function POST(request: Request) {
  try { assertTrustedRouteRequest(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Untrusted request." }, { status: requestErrorStatus(error) }); }
  const event = eventSchema.safeParse(await request.json().catch(() => null));
  if (!event.success) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  console.info(JSON.stringify(event.data));
  return new NextResponse(null, { status: 204 });
}
