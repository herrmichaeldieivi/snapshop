import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { AdminIdentity } from "@/src/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isDemoMode() {
  return !url || !anonKey;
}

export function getBrowserSupabase() {
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}

export function getServerSupabase() {
  if (!url || !anonKey) return null;
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components cannot write cookies; route handlers perform refreshes.
        }
      },
    },
  });
}

export function getServiceSupabase() {
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getCurrentIdentity(): Promise<AdminIdentity | null> {
  if (isDemoMode()) return { id: "demo-operator", email: "demo@snapshop.local", isOperator: true, isDemo: true };
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_operator").eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email ?? null, isOperator: Boolean(profile?.is_operator), isDemo: false };
}
