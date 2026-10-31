import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, isDemoMode } from "@/src/lib/supabase";

export async function GET(request: NextRequest) {
  if (isDemoMode()) return NextResponse.redirect(new URL("/admin", request.url));
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  const supabase = getServerSupabase();
  const { error } = supabase ? await supabase.auth.exchangeCodeForSession(code) : { error: new Error("Supabase is not configured.") };
  return NextResponse.redirect(new URL(error ? "/login?error=callback_failed" : "/admin", request.url));
}
