import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { requireIdentity } from "@/src/lib/access";
import { startFromHandleAction } from "./actions";

export const metadata = { title: "Start from Instagram" };

const ERRORS: Record<string, string> = {
  handle: "That doesn’t look like an Instagram username. Use letters, numbers, periods or underscores (up to 30), or paste the profile link.",
  name: "Shop names can be up to 80 characters.",
  slug: "Web addresses are 3–40 characters: lowercase letters, numbers and hyphens, and can’t be a reserved word.",
  taken: "That web address is already taken. Pick a different one below.",
};

export default async function StartPage({ searchParams }: { searchParams: { error?: string; handle?: string; name?: string; slug?: string } }) {
  const identity = await requireIdentity();
  if (!identity.isOperator) redirect("/admin");
  const error = searchParams.error ? ERRORS[searchParams.error] : null;
  const showSlug = searchParams.error === "taken" || searchParams.error === "slug";
  return (
    <AdminShell identity={identity}>
      <div className="max-w-xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Operator tool</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.06em]">Start from an Instagram handle</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Creates a draft store named after the account, then walks you through connecting Instagram, importing posts as products, and publishing.
        </p>
        <form action={startFromHandleAction} className="card mt-6 space-y-4 p-5">
          {error && <p role="alert" className="rounded-xl border border-brand-line bg-brand-soft/70 px-3.5 py-2.5 text-sm text-[#703629]">{error}</p>}
          <div>
            <label className="label" htmlFor="handle">Instagram handle</label>
            <input id="handle" name="handle" className="input" placeholder="@yourshop" defaultValue={searchParams.handle ?? ""} autoComplete="off" autoCapitalize="none" required />
          </div>
          <div>
            <label className="label" htmlFor="name">Shop name <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span></label>
            <input id="name" name="name" className="input" placeholder="Taken from the handle if blank" defaultValue={searchParams.name ?? ""} maxLength={80} />
          </div>
          {showSlug && (
            <div>
              <label className="label" htmlFor="slug">Web address</label>
              <input id="slug" name="slug" className="input" defaultValue={searchParams.slug ?? ""} maxLength={40} autoCapitalize="none" />
            </div>
          )}
          <button className="button-primary" type="submit"><Zap size={16} />Create draft store</button>
        </form>
      </div>
    </AdminShell>
  );
}
