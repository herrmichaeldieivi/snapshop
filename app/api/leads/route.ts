import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { parseLeadCapture } from "@/src/lib/lead-capture";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { isDemoMode } from "@/src/lib/supabase";

export const runtime = "nodejs";
const GUIDE_PATH = "/10-minute-shop";

export async function POST(request: Request) {
  try {
    assertTrustedRouteRequest(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Untrusted request." }, { status: requestErrorStatus(error) });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  const parsed = parseLeadCapture(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true, guideUrl: GUIDE_PATH });
  const email = parsed.data.email;
  const limiterKey = createHash("sha256").update(email).digest("hex");
  if (!takeRateLimit(`lead-magnet:${limiterKey}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "That email has reached its hourly signup limit. You can still open the free guide below." }, { status: 429 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (isDemoMode() || !url || !anonKey) {
    return NextResponse.json({ mode: "preview", guideUrl: GUIDE_PATH });
  }

  try {
    // This client uses only the public anon key; RLS and column grants restrict the write.
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await supabase.from("lead_magnet_signups").insert({ email, source: "landing_page" });
    if (error && error.code !== "23505") {
      console.error("Lead capture unavailable:", error.code);
      return NextResponse.json({ error: "Signup is temporarily unavailable. You can still open the free guide below." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, guideUrl: GUIDE_PATH });
  } catch {
    return NextResponse.json({ error: "Signup is temporarily unavailable. You can still open the free guide below." }, { status: 503 });
  }
}
