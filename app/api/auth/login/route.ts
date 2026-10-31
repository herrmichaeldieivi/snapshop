import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase, isDemoMode } from "@/src/lib/supabase";
import { takeRateLimit } from "@/src/lib/rate-limit";
import { assertTrustedRouteRequest, requestErrorStatus } from "@/src/lib/request-security";

const requestSchema = z.object({ email: z.string().email() });
export async function POST(request: Request) {
  try { assertTrustedRouteRequest(request); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Untrusted request." }, { status: requestErrorStatus(error) }); }
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  if (!takeRateLimit(`magic-link:${email}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  if (isDemoMode()) return NextResponse.json({ demo: true });
  const supabase = getServerSupabase();
  if (supabase) {
    const origin = new URL(request.url).origin;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/auth/callback` } });
  }
  // The response intentionally does not disclose whether an account exists or mail delivery succeeded.
  return NextResponse.json({ ok: true });
}
